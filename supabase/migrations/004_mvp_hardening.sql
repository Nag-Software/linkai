-- ============================================================
-- Migration 004: MVP hardening
-- - Atomic booking offer acceptance
-- - Idempotent ticket order creation
-- - Public show RLS tightened to published shows
-- ============================================================

create unique index if not exists idx_marketing_tasks_show_task_unique
  on marketing_tasks(show_id, task_key)
  where task_key is not null;

drop policy if exists "Anyone can view published shows" on shows;
create policy "Anyone can view published shows"
  on shows for select
  using (status = 'published' and date >= current_date);

create or replace function accept_booking_offer(p_token text)
returns table (
  result text,
  offer_id uuid,
  show_id uuid,
  artist_id uuid,
  show_requirement_id uuid,
  confirmed_spot_id uuid,
  should_notify boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer booking_offers%rowtype;
  v_quantity integer;
  v_filled integer;
  v_spot_id uuid;
  v_requirement record;
  v_all_filled boolean := true;
begin
  select * into v_offer
  from booking_offers bo
  where bo.token = p_token
  for update;

  if not found then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;

  if v_offer.status = 'accepted' then
    select cs.id into v_spot_id
    from confirmed_spots cs
    where cs.booking_offer_id = v_offer.id
      and cs.status in ('confirmed', 'completed', 'paid')
    limit 1;

    return query select 'accepted'::text, v_offer.id, v_offer.show_id, v_offer.artist_id,
      v_offer.show_requirement_id, v_spot_id, false;
    return;
  end if;

  if v_offer.status <> 'sent' then
    return query select v_offer.status, v_offer.id, v_offer.show_id, v_offer.artist_id,
      v_offer.show_requirement_id, null::uuid, false;
    return;
  end if;

  if v_offer.expires_at is not null and v_offer.expires_at < now() then
    update booking_offers bo
    set status = 'expired', responded_at = now()
    where bo.id = v_offer.id;

    return query select 'expired'::text, v_offer.id, v_offer.show_id, v_offer.artist_id,
      v_offer.show_requirement_id, null::uuid, false;
    return;
  end if;

  select sr.quantity into v_quantity
  from show_requirements sr
  where sr.id = v_offer.show_requirement_id
  for update;

  if not found then
    raise exception 'Show requirement not found' using errcode = 'P0002';
  end if;

  select count(*) into v_filled
  from confirmed_spots cs
  where cs.show_requirement_id = v_offer.show_requirement_id
    and cs.status in ('confirmed', 'completed', 'paid');

  if v_filled >= v_quantity then
    update booking_offers bo
    set status = 'filled_by_other', responded_at = now()
    where bo.id = v_offer.id;

    return query select 'filled_by_other'::text, v_offer.id, v_offer.show_id, v_offer.artist_id,
      v_offer.show_requirement_id, null::uuid, true;
    return;
  end if;

  insert into confirmed_spots (
    show_id,
    artist_id,
    show_requirement_id,
    booking_offer_id,
    fee_amount,
    currency,
    status,
    confirmed_at
  ) values (
    v_offer.show_id,
    v_offer.artist_id,
    v_offer.show_requirement_id,
    v_offer.id,
    v_offer.fee_amount,
    v_offer.currency,
    'confirmed',
    now()
  )
  returning id into v_spot_id;

  update booking_offers bo
  set status = 'accepted', responded_at = now()
  where bo.id = v_offer.id;

  if v_offer.fee_amount is not null then
    insert into artist_payouts (
      artist_id,
      confirmed_spot_id,
      show_id,
      amount,
      currency,
      status
    ) values (
      v_offer.artist_id,
      v_spot_id,
      v_offer.show_id,
      v_offer.fee_amount,
      v_offer.currency,
      'pending'
    );
  end if;

  select count(*) into v_filled
  from confirmed_spots cs
  where cs.show_requirement_id = v_offer.show_requirement_id
    and cs.status in ('confirmed', 'completed', 'paid');

  if v_filled >= v_quantity then
    update booking_offers bo
    set status = 'filled_by_other'
    where bo.show_requirement_id = v_offer.show_requirement_id
      and bo.status = 'sent'
      and bo.id <> v_offer.id;
  end if;

  for v_requirement in
    select sr.id, sr.quantity
    from show_requirements sr
    where sr.show_id = v_offer.show_id
    for update
  loop
    select count(*) into v_filled
    from confirmed_spots cs
    where cs.show_requirement_id = v_requirement.id
      and cs.status in ('confirmed', 'completed', 'paid');

    if v_filled < v_requirement.quantity then
      v_all_filled := false;
      exit;
    end if;
  end loop;

  if v_all_filled then
    update shows s
    set status = 'fullbooked'
    where s.id = v_offer.show_id
      and s.status in ('draft', 'booking');

    insert into marketing_tasks (show_id, task_key, label, is_completed)
    select task_rows.task_show_id, task_rows.task_key, task_rows.task_label, task_rows.task_completed
    from (values
      (v_offer.show_id, 'publish_event_page', 'Publiser event-side', false),
      (v_offer.show_id, 'activate_ticket_sales', 'Aktiver billettsalg', false),
      (v_offer.show_id, 'upload_poster', 'Last opp plakat', false),
      (v_offer.show_id, 'create_facebook_event', 'Opprett Facebook-event', false),
      (v_offer.show_id, 'share_facebook_groups', 'Del i Facebook-grupper', false),
      (v_offer.show_id, 'send_calendar_partners', 'Send til kalenderpartnere', false),
      (v_offer.show_id, 'schedule_email', 'Planlegg e-postkampanje', false)
    ) as task_rows(task_show_id, task_key, task_label, task_completed)
    where not exists (
      select 1
      from marketing_tasks mt
      where mt.show_id = task_rows.task_show_id
        and mt.task_key = task_rows.task_key
    );
  end if;

  return query select 'accepted'::text, v_offer.id, v_offer.show_id, v_offer.artist_id,
    v_offer.show_requirement_id, v_spot_id, true;
end;
$$;

create or replace function complete_checkout_order(
  p_show_id uuid,
  p_session_id text,
  p_payment_intent_id text default null,
  p_stripe_customer_id text default null,
  p_amount_total integer default 0,
  p_currency text default 'NOK',
  p_buyer_email text default null,
  p_buyer_name text default null
)
returns table (
  result text,
  order_id uuid,
  ticket_code text,
  duplicate boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show shows%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_ticket_code text;
  v_sold_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_session_id, 0));

  select o.id, t.ticket_code into v_order_id, v_ticket_code
  from orders o
  left join tickets t on t.order_id = o.id
  where o.stripe_checkout_session_id = p_session_id
  limit 1;

  if v_order_id is not null then
    return query select 'duplicate'::text, v_order_id, v_ticket_code, true;
    return;
  end if;

  select * into v_show
  from shows
  where id = p_show_id
  for update;

  if not found or v_show.status <> 'published' or v_show.date < current_date then
    insert into orders (
      show_id,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      stripe_customer_id,
      amount_total,
      currency,
      status,
      buyer_email,
      buyer_name
    ) values (
      p_show_id,
      p_session_id,
      p_payment_intent_id,
      p_stripe_customer_id,
      p_amount_total,
      upper(coalesce(p_currency, 'NOK')),
      'cancelled',
      p_buyer_email,
      p_buyer_name
    )
    returning id into v_order_id;

    return query select 'invalid_show'::text, v_order_id, null::text, false;
    return;
  end if;

  select count(*) into v_sold_count
  from tickets
  where show_id = p_show_id
    and status in ('valid', 'used');

  if v_show.capacity is not null and v_sold_count >= v_show.capacity then
    insert into orders (
      show_id,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      stripe_customer_id,
      amount_total,
      currency,
      status,
      buyer_email,
      buyer_name
    ) values (
      p_show_id,
      p_session_id,
      p_payment_intent_id,
      p_stripe_customer_id,
      p_amount_total,
      upper(coalesce(p_currency, 'NOK')),
      'cancelled',
      p_buyer_email,
      p_buyer_name
    )
    returning id into v_order_id;

    return query select 'sold_out'::text, v_order_id, null::text, false;
    return;
  end if;

  if p_buyer_email is not null and length(trim(p_buyer_email)) > 0 then
    select id into v_customer_id
    from customers
    where lower(email) = lower(p_buyer_email)
    order by created_at asc
    limit 1;

    if v_customer_id is null then
      insert into customers (email, name, stripe_customer_id)
      values (p_buyer_email, nullif(p_buyer_name, ''), p_stripe_customer_id)
      returning id into v_customer_id;
    end if;
  end if;

  insert into orders (
    show_id,
    customer_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_customer_id,
    amount_total,
    currency,
    status,
    buyer_email,
    buyer_name
  ) values (
    p_show_id,
    v_customer_id,
    p_session_id,
    p_payment_intent_id,
    p_stripe_customer_id,
    p_amount_total,
    upper(coalesce(p_currency, 'NOK')),
    'paid',
    p_buyer_email,
    p_buyer_name
  )
  returning id into v_order_id;

  insert into tickets (show_id, order_id, customer_id, status)
  values (p_show_id, v_order_id, v_customer_id, 'valid')
  returning tickets.ticket_code into v_ticket_code;

  return query select 'created'::text, v_order_id, v_ticket_code, false;
end;
$$;