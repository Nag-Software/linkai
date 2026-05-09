-- ============================================================
-- Seed real Norwegian comedians with public Wikimedia images.
--
-- Destructive for artist data: keeps only artists with
-- casper_nag@outlook.com, then inserts the profiles below.
-- Test email addresses use the reserved .test TLD and are not
-- real contact details for the comedians.
-- ============================================================

begin;

delete from artists
where lower(email) <> 'casper_nag@outlook.com';

with real_artists (
  full_name,
  stage_name,
  email,
  profile_image_url,
  bio,
  category,
  language,
  wikipedia_url,
  admin_score,
  admin_energy_level,
  admin_tags
) as (
  values
    (
      'Atle Antonsen',
      'Atle Antonsen',
      'atle.antonsen@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/3/3d/Atle_Antonsen_Parkteatret_Crap_%C3%A5pp%C3%A5_Park_%28235728%29.jpg',
      'Norsk komiker, skuespiller og programleder kjent fra blant annet Team Antonsen, Ut i var hage og Kongen befaler.',
      'Standup / TV-komedie',
      'Norsk',
      'https://no.wikipedia.org/wiki/Atle_Antonsen',
      9,
      'high',
      array['standup', 'tv', 'sketsj', 'erfaren', 'headliner']
    ),
    (
      'Bård Tufte Johansen',
      'Bård Tufte Johansen',
      'bard.tufte.johansen@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/2/2d/B%C3%A5rd_Tufte_Johansen_Parkteatret_Crap_%C3%A5pp%C3%A5_Park_cropped_%28190839%29.jpg',
      'Norsk komiker, programleder og manusforfatter med lang fartstid fra satirisk TV-komedie og sceneshow.',
      'TV-komedie / satire',
      'Norsk',
      'https://no.wikipedia.org/wiki/B%C3%A5rd_Tufte_Johansen',
      9,
      'high',
      array['satire', 'tv', 'sketsj', 'erfaren', 'headliner']
    ),
    (
      'Else Kåss Furuseth',
      'Else Kåss Furuseth',
      'else.kass.furuseth@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/7/70/Else_K%C3%A5ss_Furuseth_%28cropped%29.jpg',
      'Norsk komiker, programleder og scenepersonlighet kjent for varm, personlig og publikumsnaer humor.',
      'Standup / scene',
      'Norsk',
      'https://no.wikipedia.org/wiki/Else_K%C3%A5ss_Furuseth',
      9,
      'high',
      array['standup', 'personlig', 'varm', 'tv', 'headliner']
    ),
    (
      'Harald Eia',
      'Harald Eia',
      'harald.eia@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/3/39/Harald_Eia_%282026-03-04_bilde02%29.jpg',
      'Norsk komiker, programleder og manusforfatter kjent fra flere sentrale norske humor- og satireproduksjoner.',
      'TV-komedie / satire',
      'Norsk',
      'https://no.wikipedia.org/wiki/Harald_Eia',
      9,
      'low',
      array['satire', 'tv', 'sketsj', 'smart', 'erfaren']
    ),
    (
      'Jon Almaas',
      'Jon Almaas',
      'jon.almaas@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/e/e9/Jon_Almaas_og_Thor_Gjermund_Eriksen_-_Opening_-_NMD_2013_%288721241984%29_%28cropped%29.jpg',
      'Norsk komiker, programleder og forfatter kjent for presis, tørr humor og mange år i norsk underholdning.',
      'TV-komedie / konferansier',
      'Norsk',
      'https://no.wikipedia.org/wiki/Jon_Almaas',
      8,
      'low',
      array['tv', 'deadpan', 'konferansier', 'erfaren', 'torr']
    ),
    (
      'Linn Skåber',
      'Linn Skåber',
      'linn.skaber@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/d/d4/Linn_Sk%C3%A5ber_-_Nordiske_Mediedager_2010_%28cropped%29.jpg',
      'Norsk komiker, skuespiller og tekstforfatter kjent fra TV, scene og karakterbasert humor.',
      'Scene / TV-komedie',
      'Norsk',
      'https://no.wikipedia.org/wiki/Linn_Sk%C3%A5ber',
      9,
      'low',
      array['scene', 'karakter', 'tekst', 'tv', 'erfaren']
    ),
    (
      'Lisa Tønne',
      'Lisa Tønne',
      'lisa.tonne@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/6/60/DZ6_4654.jpg',
      'Norsk komiker og skuespiller med tydelig sceneenergi, karakterarbeid og bred erfaring fra TV og sceneshow.',
      'Standup / scene',
      'Norsk',
      'https://no.wikipedia.org/wiki/Lisa_T%C3%B8nne',
      9,
      'high',
      array['standup', 'karakter', 'energi', 'tv', 'headliner']
    ),
    (
      'Sigrid Bonde Tusvik',
      'Sigrid Bonde Tusvik',
      'sigrid.bonde.tusvik@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/6/61/Sigrid_Bonde_Tusvik_2010_%28cropped%29.jpg',
      'Norsk komiker, programleder og podkastprofil kjent for direkte, personlig og samfunnsaktuell humor.',
      'Standup / podkast',
      'Norsk',
      'https://no.wikipedia.org/wiki/Sigrid_Bonde_Tusvik',
      9,
      'high',
      array['standup', 'podkast', 'samfunn', 'personlig', 'headliner']
    ),
    (
      'Thomas Giertsen',
      'Thomas Giertsen',
      'thomas.giertsen@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/9/9d/Masterclass_med_Thomas_Giertsen._-_NMD_2014_%2814133381292%29.jpg',
      'Norsk komiker, serieskaper og produsent kjent for standup, TV-komedie og lang erfaring i norsk humorbransje.',
      'Standup / TV-komedie',
      'Norsk',
      'https://no.wikipedia.org/wiki/Thomas_Giertsen',
      9,
      'low',
      array['standup', 'tv', 'produsent', 'erfaren', 'headliner']
    ),
    (
      'Anne-Kat. Hærland',
      'Anne-Kat. Hærland',
      'anne-kat.haerland@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/5/5a/Anne-Kat._H%C3%A6rland.jpg',
      'Norsk komiker, forfatter og programleder kjent for skarp, observant og samfunnsorientert humor.',
      'Standup / satire',
      'Norsk',
      'https://no.wikipedia.org/wiki/Anne-Kat._H%C3%A6rland',
      9,
      'low',
      array['standup', 'satire', 'observasjon', 'samfunn', 'headliner']
    ),
    (
      'Are Kalvø',
      'Are Kalvø',
      'are.kalvo@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/7/73/Are_Kalv%C3%B82_%28cropped%29.jpg',
      'Norsk komiker, forfatter og satiriker kjent for nynorsk humor, samfunnssatire og sceneforestillinger.',
      'Satire / scene',
      'Norsk',
      'https://no.wikipedia.org/wiki/Are_Kalv%C3%B8',
      8,
      'low',
      array['satire', 'scene', 'forfatter', 'samfunn', 'erfaren']
    ),
    (
      'Christian Mikkelsen',
      'Christian Mikkelsen',
      'christian.mikkelsen@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/e/e5/Christian_Mikkelsen_%26_Martin_Beyer-Olsen_-_NMD_UNG_2018_%2841128280364%29_%28cropped%29.jpg',
      'Norsk komiker, skuespiller og programleder kjent for karakterhumor, improvisasjon og energiske TV-opptredener.',
      'Impro / TV-komedie',
      'Norsk',
      'https://no.wikipedia.org/wiki/Christian_Mikkelsen',
      8,
      'high',
      array['impro', 'karakter', 'tv', 'energi', 'support']
    ),
    (
      'Johan Golden',
      'Johan Golden',
      'johan.golden@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/2/29/Johan-Golden_TonsOfRock-2025-2.jpg',
      'Norsk komiker, programleder og musiker kjent for radio, TV-humor og en tydelig, publikumsvennlig stil.',
      'Radio / TV-komedie',
      'Norsk',
      'https://no.wikipedia.org/wiki/Johan_Golden',
      8,
      'high',
      array['radio', 'tv', 'musikk', 'publikum', 'erfaren']
    ),
    (
      'Odd-Magnus Williamson',
      'Odd-Magnus Williamson',
      'odd-magnus.williamson@seed.humor.test',
      'https://upload.wikimedia.org/wikipedia/commons/a/a2/Odd-Magnus_Williamson_%28211417%29.jpg',
      'Norsk komiker, skuespiller og manusforfatter kjent fra humorserier, film og scenebaserte opptredener.',
      'TV-komedie / scene',
      'Norsk',
      'https://no.wikipedia.org/wiki/Odd-Magnus_Williamson',
      8,
      'high',
      array['tv', 'scene', 'skuespill', 'energi', 'support']
    )
),
inserted_artists as (
  insert into artists (
    full_name,
    stage_name,
    email,
    phone,
    profile_image_url,
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
    null,
    profile_image_url,
    bio,
    category,
    language,
    jsonb_build_object(
      'wikipedia', wikipedia_url,
      'image_source', profile_image_url
    ),
    false,
    'approved',
    admin_score,
    admin_energy_level,
    admin_tags,
    format('Seedet ekte norsk komikerprofil. Kontaktinfo er testadresse; bilde/kilde: %s', wikipedia_url)
  from real_artists
  returning id, full_name, stage_name, email, admin_score, admin_energy_level, admin_tags, profile_image_url
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
  inserted_artists.id,
  inserted_artists.admin_score,
  inserted_artists.admin_energy_level,
  'professional',
  'medium',
  inserted_artists.admin_tags,
  format('%s er en seedet, ekte norsk komikerprofil for demo og lokal testing.', coalesce(inserted_artists.stage_name, inserted_artists.full_name)),
  'Vurderingen er seedet manuelt fra offentlig profilinformasjon og brukes til demo/testing.',
  'Kontaktinfo er testdata. Sjekk alltid faktisk bookingkontakt utenfor seed-data.',
  jsonb_build_array(
    jsonb_build_object('url', real_artists.wikipedia_url, 'description', 'Wikipedia-profil'),
    jsonb_build_object('url', inserted_artists.profile_image_url, 'description', 'Wikimedia-bilde')
  ),
  'completed',
  now()
from inserted_artists
join real_artists using (email);

commit;

-- Quick check:
-- select full_name, stage_name, email, profile_image_url, admin_score, admin_energy_level, admin_tags
-- from artists
-- order by case when lower(email) = 'casper_nag@outlook.com' then 0 else 1 end, full_name;