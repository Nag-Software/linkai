-- Mock comedians for local/demo testing.
-- Safe to rerun: removes previous mock comedians using the @mock.humor.test email domain.

begin;

delete from artists
where email like '%@mock.humor.test';

with mock_artists (
  full_name,
  stage_name,
  email,
  phone,
  bio,
  category,
  language,
  social_links,
  consent_ai_research,
  status,
  admin_score,
  admin_energy_level,
  admin_tags,
  admin_notes
) as (
  values
    ('Aksel Berg', 'Aksel B.', 'aksel.berg@mock.humor.test', '+47 400 10 001', 'Observasjonskomiker med tørre punchlines om kollektivtransport, familieliv og små katastrofer i hverdagen.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/akselb_mock'), true, 'approved', 8, 'low', array['observasjon', 'hverdag', 'tørr', 'oslo'], 'Mock: trygg opener/support med lavmælt stil.'),
    ('Mina Solheim', 'Mina Sol', 'mina.solheim@mock.humor.test', '+47 400 10 002', 'Rask, musikalsk og publikumsnær komiker som blander relasjoner, dating og spontane crowd-work-partier.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/minasol_mock', 'tiktok', 'https://tiktok.com/@minasol_mock'), true, 'approved', 9, 'high', array['crowd-work', 'dating', 'musikk', 'energi'], 'Mock: sterk headliner-kandidat.'),
    ('Jonas Vik', 'Jonas Vik', 'jonas.vik@mock.humor.test', '+47 400 10 003', 'Lun historieforteller fra vestlandet med materiale om småbyliv, jobbintervjuer og alt som kan gå galt på hyttetur.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/jonasvik_mock'), true, 'approved', 7, 'low', array['storytelling', 'vestlandet', 'hverdag', 'lun'], 'Mock: passer godt på intime scener.'),
    ('Sara Nguyen', 'Sara N.', 'sara.nguyen@mock.humor.test', '+47 400 10 004', 'Skarp komiker med tempo, selvironi og materiale om kulturkrasj, studielån og moderne arbeidsliv.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/saran_mock', 'youtube', 'https://youtube.com/@saran_mock'), true, 'approved', 8, 'high', array['kultur', 'arbeidsliv', 'selvironi', 'tempo'], 'Mock: solid support/headliner.'),
    ('Eirik Holm', 'Holm', 'eirik.holm@mock.humor.test', '+47 400 10 005', 'Deadpan-komiker med korte vitser, absurde vendinger og stoisk sceneuttrykk.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/holm_mock'), true, 'approved', 7, 'low', array['deadpan', 'absurd', 'one-liners', 'tørr'], 'Mock: god kontrast i lineup.'),
    ('Nora Iversen', 'Nora Iversen', 'nora.iversen@mock.humor.test', '+47 400 10 006', 'Energisk komiker med fysisk spillestil, raske karakterer og historier fra servicebransjen.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/noraiversen_mock', 'tiktok', 'https://tiktok.com/@noraiversen_mock'), true, 'approved', 9, 'high', array['fysisk', 'karakter', 'servicebransjen', 'energi'], 'Mock: høy energi, fungerer tidlig og sent i show.'),
    ('Omar Haddad', 'Omar H.', 'omar.haddad@mock.humor.test', '+47 400 10 007', 'Smart og varm standup om familieforventninger, språkforvirring og å være overkvalifisert for kaos.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/omarh_mock'), true, 'approved', 8, 'high', array['familie', 'språk', 'kultur', 'varm'], 'Mock: publikumsvennlig support.'),
    ('Thea Strand', 'Thea Strand', 'thea.strand@mock.humor.test', '+47 400 10 008', 'Mørk, presis og sjarmerende komiker med materiale om terapi, vennskap og dårlige valg.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/theastrand_mock'), true, 'approved', 8, 'low', array['mørk', 'terapi', 'relasjoner', 'presis'], 'Mock: voksen tone, fin til kveldsprogram.'),
    ('Marius Lunde', 'Marius Lunde', 'marius.lunde@mock.humor.test', '+47 400 10 009', 'Improvisatør og standup-komiker som liker høyt tempo, publikum og lokale referanser.', 'Impro', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/mariuslunde_mock'), true, 'approved', 7, 'high', array['impro', 'crowd-work', 'lokal', 'tempo'], 'Mock: fleksibel MC/support.'),
    ('Ida Bakke', 'Ida Bakke', 'ida.bakke@mock.humor.test', '+47 400 10 010', 'Lavmælt, intelligent og overraskende komiker med materiale om akademia, angst og norsk smalltalk.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/idabakke_mock'), true, 'approved', 7, 'low', array['smart', 'akademia', 'angst', 'lavmælt'], 'Mock: passer som opener eller tematisk support.'),
    ('Felix Nilsen', 'Felix Nilsen', 'felix.nilsen@mock.humor.test', '+47 400 10 011', 'Rask scenepersonlighet med vitser om gaming, kollektiv, treningsapper og internettkultur.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/felixn_mock', 'tiktok', 'https://tiktok.com/@felixn_mock'), true, 'approved', 6, 'high', array['gaming', 'internett', 'ung', 'tempo'], 'Mock: ung profil, bra til studentpublikum.'),
    ('Kaja Moen', 'Kaja Moen', 'kaja.moen@mock.humor.test', '+47 400 10 012', 'Fortellerbasert standup med varme historier om familie, bygdeliv og konfliktsky nordmenn.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/kajamoen_mock'), true, 'approved', 8, 'low', array['storytelling', 'bygdeliv', 'familie', 'varm'], 'Mock: trygg og bred appell.'),
    ('Leo Karlsen', 'Leo K.', 'leo.karlsen@mock.humor.test', '+47 400 10 013', 'Engelskspråklig komiker med internasjonal profil, raske observasjoner og skarp publikumsdialog.', 'Standup', 'Engelsk', jsonb_build_object('instagram', 'https://instagram.com/leok_mock', 'youtube', 'https://youtube.com/@leok_mock'), true, 'approved', 8, 'high', array['english', 'crowd-work', 'international', 'sharp'], 'Mock: bra for engelske show.'),
    ('Sofie Dahl', 'Sofie Dahl', 'sofie.dahl@mock.humor.test', '+47 400 10 014', 'Satirisk komiker med materiale om politikk, kontorliv og nyheter hun helst skulle sluppet å lese.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/sofiedahl_mock'), true, 'approved', 8, 'low', array['satire', 'politikk', 'kontor', 'nyheter'], 'Mock: smart support/headliner.'),
    ('Henrik Aas', 'Henrik Aas', 'henrik.aas@mock.humor.test', '+47 400 10 015', 'Fysisk og leken komiker med absurde historier, karakterer og plutselige musikalske innslag.', 'Sketsj', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/henrikaas_mock'), true, 'approved', 7, 'high', array['absurd', 'fysisk', 'karakter', 'musikk'], 'Mock: god variasjon i blandede kvelder.'),
    ('Amalie Rustad', 'Amalie Rustad', 'amalie.rustad@mock.humor.test', '+47 400 10 016', 'Selvironisk standup om småbarnsliv, søvnmangel, interiørvalg og familiechatten som aldri dør.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/amalierustad_mock'), true, 'approved', 7, 'low', array['familie', 'småbarn', 'hverdag', 'selvironi'], 'Mock: bred og gjenkjennelig.'),
    ('Bilal Osman', 'Bilal Osman', 'bilal.osman@mock.humor.test', '+47 400 10 017', 'Høyenergisk komiker med punchy materiale om trening, venner, familie og dårlige økonomiske valg.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/bilalosman_mock', 'tiktok', 'https://tiktok.com/@bilalosman_mock'), true, 'approved', 9, 'high', array['energi', 'familie', 'trening', 'punchy'], 'Mock: sterk publikumsvekker.'),
    ('Vilde Hagen', 'Vilde Hagen', 'vilde.hagen@mock.humor.test', '+47 400 10 018', 'Rolig, presis og mørkt morsom komiker med materiale om singelliv, helseapper og lav sosial kapasitet.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/vildehagen_mock'), true, 'approved', 7, 'low', array['mørk', 'dating', 'helse', 'presis'], 'Mock: passer godt i voksen lineup.'),
    ('Kristoffer Lie', 'Kris Lie', 'kristoffer.lie@mock.humor.test', '+47 400 10 019', 'MC-type med rask respons, vennlig publikumskontakt og materiale om sport, pappaer og lokalaviser.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/krislie_mock'), true, 'approved', 8, 'high', array['mc', 'crowd-work', 'sport', 'lokal'], 'Mock: egnet som konferansier.'),
    ('Hanna Eide', 'Hanna Eide', 'hanna.eide@mock.humor.test', '+47 400 10 020', 'Observasjonskomiker med skarpe poeng om venninnegjenger, pendling og ritualene rundt fredagstaco.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/hannaeide_mock'), true, 'approved', 6, 'low', array['observasjon', 'vennskap', 'hverdag', 'mat'], 'Mock: fin opener.'),
    ('Sander Myhre', 'Sander Myhre', 'sander.myhre@mock.humor.test', '+47 400 10 021', 'Ung komiker med raske bits om teknologi, sosiale medier og det å late som man forstår vin.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/sandermyhre_mock', 'tiktok', 'https://tiktok.com/@sandermyhre_mock'), true, 'approved', 6, 'high', array['ung', 'teknologi', 'sosiale medier', 'tempo'], 'Mock: studentvennlig og lett å plassere.'),
    ('Liv Martinsen', 'Liv Martinsen', 'liv.martinsen@mock.humor.test', '+47 400 10 022', 'Erfaren revy- og standup-komiker med tydelige karakterer, timing og klassisk publikumstekke.', 'Revy', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/livmartinsen_mock'), true, 'approved', 9, 'low', array['revy', 'karakter', 'erfaren', 'klassisk'], 'Mock: erfaren headliner/profil.'),
    ('Adam Qureshi', 'Adam Q.', 'adam.qureshi@mock.humor.test', '+47 400 10 023', 'To-språklig komiker med presise observasjoner om identitet, byliv, familie og dårlig planlegging.', 'Standup', 'Begge', jsonb_build_object('instagram', 'https://instagram.com/adamq_mock', 'youtube', 'https://youtube.com/@adamq_mock'), true, 'approved', 8, 'high', array['bilingual', 'kultur', 'byliv', 'familie'], 'Mock: fleksibel norsk/engelsk.'),
    ('Tuva Rønning', 'Tuva Rønning', 'tuva.ronning@mock.humor.test', '+47 400 10 024', 'Lavmælt og smart komiker med historier om arbeidslivet, sjefsspråk og små moralske nederlag.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/tuvaronning_mock'), true, 'approved', 7, 'low', array['arbeidsliv', 'smart', 'storytelling', 'lavmælt'], 'Mock: god til corporate-nære tema.'),
    ('Patrick Sørensen', 'Patrick Sørensen', 'patrick.sorensen@mock.humor.test', '+47 400 10 025', 'Høy og bråkete på scenen, med vitser om datingapper, fotball, naboer og å alltid miste nøklene.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/patricks_mock'), true, 'approved', 7, 'high', array['dating', 'sport', 'høy energi', 'hverdag'], 'Mock: tydelig energi i midtparti.'),
    ('Marte Wold', 'Marte Wold', 'marte.wold@mock.humor.test', '+47 400 10 026', 'Mørk og poetisk komiker med overraskende vendinger om klimaangst, leilighetsjakt og dårlig samvittighet.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/martewold_mock'), true, 'approved', 8, 'low', array['mørk', 'klima', 'poetisk', 'presis'], 'Mock: særpreg og voksen tone.'),
    ('Noah Lind', 'Noah Lind', 'noah.lind@mock.humor.test', '+47 400 10 027', 'Impro-sterk komiker med lett tone, raske tags og materiale om studier, deltidsjobb og familie på Facebook.', 'Impro', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/noahlind_mock'), true, 'approved', 6, 'high', array['impro', 'ung', 'familie', 'tempo'], 'Mock: opener/support med fleksibilitet.'),
    ('Elise Fosse', 'Elise Fosse', 'elise.fosse@mock.humor.test', '+47 400 10 028', 'Presis og varm komiker med materiale om helsevesen, vennskap, dating og å være litt for pliktoppfyllende.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/elisefosse_mock'), true, 'approved', 8, 'low', array['varm', 'helse', 'dating', 'vennskap'], 'Mock: god publikumsappell.'),
    ('Ruben Ali', 'Ruben Ali', 'ruben.ali@mock.humor.test', '+47 400 10 029', 'Publikumssterk komiker med høyt tempo, historier om familiefester, reiser og gode intensjoner som kollapser.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/rubenali_mock', 'tiktok', 'https://tiktok.com/@rubenali_mock'), true, 'approved', 9, 'high', array['crowd-work', 'familie', 'reise', 'energi'], 'Mock: headliner-kandidat med energi.'),
    ('Ingrid Tangen', 'Ingrid Tangen', 'ingrid.tangen@mock.humor.test', '+47 400 10 030', 'Tørr og elegant komiker med one-liners om høflighet, økonomi, bygårder og alt man ikke sier høyt.', 'Standup', 'Norsk', jsonb_build_object('instagram', 'https://instagram.com/ingridtangen_mock'), true, 'approved', 7, 'low', array['one-liners', 'tørr', 'økonomi', 'elegant'], 'Mock: sterk kontrast og ren standup-stil.')
),
inserted_artists as (
  insert into artists (
    full_name,
    stage_name,
    email,
    phone,
    bio,
    category,
    language,
    social_links,
    consent_ai_research,
    status,
    admin_score,
    admin_energy_level,
    admin_tags,
    admin_notes
  )
  select
    full_name,
    stage_name,
    email,
    phone,
    bio,
    category,
    language,
    social_links,
    consent_ai_research,
    status,
    admin_score,
    admin_energy_level,
    admin_tags,
    admin_notes
  from mock_artists
  returning id, full_name, stage_name, admin_score, admin_energy_level, admin_tags
)
insert into artist_ai_assessments (
  artist_id,
  ai_score_suggestion,
  ai_energy_suggestion,
  ai_experience_level,
  ai_confidence,
  ai_tags_suggestion,
  ai_summary,
  ai_reasoning,
  ai_uncertainties,
  ai_sources,
  ai_status,
  ai_last_checked_at
)
select
  id,
  admin_score,
  admin_energy_level,
  case
    when admin_score >= 9 then 'professional'
    when admin_score >= 8 then 'experienced'
    when admin_score >= 7 then 'intermediate'
    else 'beginner'
  end,
  'medium',
  admin_tags,
  format('%s er en mock-komiker for testing av booking, krav, lineup og matching.', coalesce(stage_name, full_name)),
  'Mock assessment generert fra seed-data. Brukes kun for lokal/demo testing.',
  'Ingen ekte AI-research er kjørt for denne mock-profilen.',
  jsonb_build_array(jsonb_build_object('url', 'mock://seed', 'description', 'Seedet mockdata')),
  'completed',
  now()
from inserted_artists;

commit;

-- Quick check:
-- select full_name, stage_name, admin_score, admin_energy_level, admin_tags
-- from artists
-- where email like '%@mock.humor.test'
-- order by full_name;
