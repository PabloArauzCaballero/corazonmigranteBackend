'use strict';

/**
 * Seeder idempotente: primer contenido editorial oficial de Corazón Migrante
 * y limpieza (archivado) del contenido público demo anterior.
 *
 * - Crea/actualiza el artículo editorial real (publication_type = NEWS, PUBLISHED).
 * - Archiva las publicaciones demo antiguas para que dejen de aparecer en público.
 * - Se puede volver a correr sin duplicar (ON CONFLICT por slug) y re-archiva las
 *   demo aunque otros seeders las vuelvan a publicar (este corre al final por fecha).
 */
const { randomUUID } = require('crypto');

const jsonb = (value) => JSON.stringify(value);

async function query(qi, sql, replacements = {}) {
  return qi.sequelize.query(sql, { replacements });
}
async function scalar(qi, sql, replacements = {}) {
  const [rows] = await query(qi, sql, replacements);
  return rows?.[0] ?? null;
}

// Publicaciones demo antiguas que NO deben mostrarse en la sección pública.
const LEGACY_SLUGS = [
  'guia-inicial-para-personas-migrantes',
  'redes-de-apoyo-para-migrantes',
  'guia-inicial-para-migrantes',
  'acompanar-sin-juzgar',
  'columna-acompanar-sin-juzgar',
];

const ARTICLE = {
  slug: 'preparacion-emocional-antes-de-migrar',
  title: 'Cómo prepararte emocionalmente antes de migrar: una guía paso a paso',
  summary:
    'Migrar no empieza en el aeropuerto: empieza mucho antes, por dentro. Esta guía práctica te ayuda a preparar tu bienestar emocional para que el cambio pese menos y no te tome por sorpresa.',
  body: [
    'Cuando pensamos en migrar, solemos concentrarnos en lo visible: los papeles, el pasaje, el trabajo, el lugar donde vamos a vivir. Rara vez alguien nos dice que también conviene preparar lo invisible: cómo vamos a sostenernos por dentro cuando lo conocido quede atrás. Y, sin embargo, esa preparación emocional suele marcar la diferencia entre un proceso que desgasta y uno que, aun siendo difícil, se puede transitar con más calma.',
    'Prepararte emocionalmente no significa "estar fuerte" ni convencerte de que no vas a extrañar. Significa anticipar lo que puede doler, darle nombre y llegar con recursos. Esta guía propone cuatro pasos concretos que puedes empezar antes de hacer la maleta.',
    'Paso 1: Nombra lo que sientes antes de irte. La ansiedad crece en lo que no se dice. Días antes de migrar es normal sentir una mezcla contradictoria: entusiasmo y miedo, culpa y alivio, tristeza y esperanza, todo al mismo tiempo. Escribir lo que sientes, hablarlo con alguien de confianza o simplemente reconocerlo en voz alta reduce esa sensación de "algo malo va a pasar". No estás exagerando: estás enfrentando uno de los cambios más grandes de tu vida.',
    'Paso 2: Ordena lo práctico para liberar la mente. Gran parte del agotamiento emocional del inicio viene de la incertidumbre. Tener resueltos —o al menos organizados— los primeros pasos concretos (dónde vas a dormir las primeras noches, cómo vas a comunicarte con tu familia, qué documentos llevas, cuánto dinero necesitas para el primer mes) le quita peso a la cabeza. No se trata de controlarlo todo, sino de reducir las variables abiertas para poder enfocar tu energía en adaptarte.',
    'Paso 3: Construye tu red de apoyo antes de necesitarla. Muchas personas esperan a sentirse solas para buscar compañía, y entonces cuesta más. Antes de migrar, identifica al menos dos o tres puntos de apoyo: alguien de tu país con quien mantendrás contacto frecuente, y si es posible, algún contacto o grupo en el lugar de destino (asociaciones de migrantes, comunidades religiosas, grupos por intereses). Pertenecer, aunque sea un poco, amortigua el desarraigo.',
    'Paso 4: Ajusta tus expectativas sin apagar la esperanza. Las redes sociales muestran migraciones perfectas: logros, paisajes, sonrisas. La realidad suele incluir semanas de adaptación, trámites lentos, momentos de duda y días en los que todo cuesta el doble. Saber esto de antemano no es pesimismo: es lo que evita que interpretes las dificultades normales como un fracaso personal. Migrar bien no es no sufrir; es saber que el malestar inicial casi siempre es pasajero.',
    'Errores frecuentes al prepararse. Uno de los más comunes es exigirse estar agradecido todo el tiempo y prohibirse extrañar. Otro es cortar de golpe con el país de origen para "no sufrir", cuando mantener vínculos sanos ayuda a sostener la identidad. Y otro más es cargar solo con todo, sin pedir ayuda, por miedo a preocupar a la familia. Reconocer estos patrones antes de partir te permite elegir de otra manera.',
    'Un ejemplo concreto. Ana decidió migrar por estudios. Antes de viajar, escribió una carta a sí misma con lo que temía y lo que esperaba, dejó acordadas videollamadas fijas con su madre los domingos, y se unió a un grupo de estudiantes de su país en la ciudad de destino. Los primeros meses igual fueron duros, pero cuando aparecía la nostalgia tenía a dónde acudir. La preparación no le evitó el duelo migratorio: le dio herramientas para atravesarlo.',
    'Recomendaciones prácticas para empezar hoy. Dedica un momento a escribir tres cosas que vas a extrañar y tres que esperas encontrar. Define cómo y cada cuánto vas a hablar con tu gente. Investiga una comunidad o grupo en tu destino. Y guarda, en algún lugar accesible, un recordatorio simple: "sentir tristeza o miedo no significa que me equivoqué; significa que estoy atravesando un cambio enorme".',
    'Conclusión. Migrar transforma mucho más que tu dirección. Preparar tu bienestar emocional no elimina las pérdidas ni las despedidas, pero te permite llegar con recursos en lugar de llegar en blanco. Cuando el cuerpo cambia de lugar, la mente necesita tiempo para sentirse a salvo. Dárselo, con intención y con apoyo, es uno de los actos de cuidado más importantes de todo el proceso.',
    'Si estás por migrar o ya lo hiciste y sientes que te vendría bien acompañamiento, en Corazón Migrante trabajamos exactamente esto: la salud emocional de quienes viven lejos de casa. No tienes que atravesarlo en silencio.',
  ].join('\n\n'),
  seo: {
    description:
      'Guía práctica para preparar tu bienestar emocional antes de migrar: nombrar lo que sientes, ordenar lo práctico, construir tu red de apoyo y ajustar expectativas.',
    keywords: [
      'preparación emocional migrar',
      'bienestar emocional migrante',
      'duelo migratorio',
      'salud mental migración',
      'consejos antes de migrar',
    ],
    ogImage:
      'https://res.cloudinary.com/sfyimi9x/image/upload/v1784814031/corazon-migrante/public/cms/1ae48a3b-b7cb-424b-baa4-635c93e4031b/f4555f35-a264-471f-8503-4b95507958c6.png',
    coverImage:
      'https://res.cloudinary.com/sfyimi9x/image/upload/v1784814031/corazon-migrante/public/cms/1ae48a3b-b7cb-424b-baa4-635c93e4031b/f4555f35-a264-471f-8503-4b95507958c6.png',
    canonicalSlug: 'preparacion-emocional-antes-de-migrar',
  },
};

async function ensureCategory(qi, now) {
  await query(
    qi,
    `INSERT INTO content_categories (id, slug, name, description, is_active, sort_order, created_at, updated_at)
     VALUES (:id, 'preparacion-y-bienestar', 'Preparación y bienestar', 'Guías prácticas para cuidar la salud emocional en el proceso migratorio.', true, 2, :now, :now)
     ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), now },
  );
  return scalar(qi, `SELECT id FROM content_categories WHERE slug = 'preparacion-y-bienestar'`);
}

async function ensureAuthor(qi, now) {
  const admin = await scalar(qi, `SELECT id FROM users WHERE email = 'admin@corazonmigrante.test' LIMIT 1`);
  const existing = await scalar(
    qi,
    `SELECT id FROM content_authors WHERE display_name = 'Equipo Corazón Migrante' AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1`,
  );
  if (existing) return existing;
  const id = randomUUID();
  await query(
    qi,
    `INSERT INTO content_authors (id, user_id, display_name, headline, bio, status, metadata, created_at, updated_at)
     VALUES (:id, :userId, 'Equipo Corazón Migrante', 'Redacción institucional', 'Equipo editorial de Corazón Migrante.', 'ACTIVE', '{}'::jsonb, :now, :now)`,
    { id, userId: admin?.id ?? null, now },
  );
  return { id };
}

async function ensureTag(qi, slug, name, now) {
  await query(
    qi,
    `INSERT INTO content_tags (id, slug, name, created_at, updated_at)
     VALUES (:id, :slug, :name, :now, :now)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), slug, name, now },
  );
  return scalar(qi, 'SELECT id FROM content_tags WHERE slug = :slug', { slug });
}

module.exports = {
  ARTICLE,
  LEGACY_SLUGS,
  async up(queryInterface) {
    const now = new Date();
    const category = await ensureCategory(queryInterface, now);
    const author = await ensureAuthor(queryInterface, now);

    await query(
      queryInterface,
      `INSERT INTO content_publications
         (id, author_id, category_id, slug, title, summary, body, publication_type, access_type, status, comments_enabled, reactions_enabled, published_at, seo_metadata, created_at, updated_at)
       VALUES
         (:id, :authorId, :categoryId, :slug, :title, :summary, :body, 'NEWS', 'PUBLIC', 'PUBLISHED', true, true, :now, :seo, :now, :now)
       ON CONFLICT (slug) DO UPDATE
         SET author_id = EXCLUDED.author_id, category_id = EXCLUDED.category_id, title = EXCLUDED.title,
             summary = EXCLUDED.summary, body = EXCLUDED.body, publication_type = 'NEWS',
             access_type = 'PUBLIC', status = 'PUBLISHED',
             published_at = COALESCE(content_publications.published_at, EXCLUDED.published_at),
             seo_metadata = EXCLUDED.seo_metadata, updated_at = EXCLUDED.updated_at, deleted_at = NULL`,
      {
        id: randomUUID(),
        authorId: author.id,
        categoryId: category.id,
        slug: ARTICLE.slug,
        title: ARTICLE.title,
        summary: ARTICLE.summary,
        body: ARTICLE.body,
        seo: jsonb(ARTICLE.seo),
        now,
      },
    );

    const publication = await scalar(
      queryInterface,
      'SELECT id FROM content_publications WHERE slug = :slug',
      { slug: ARTICLE.slug },
    );
    for (const [slug, name] of [
      ['duelo-migratorio', 'Duelo migratorio'],
      ['bienestar-emocional', 'Bienestar emocional'],
      ['preparacion', 'Preparación'],
    ]) {
      const tag = await ensureTag(queryInterface, slug, name, now);
      await query(
        queryInterface,
        `INSERT INTO content_publication_tags (publication_id, tag_id) VALUES (:pid, :tid) ON CONFLICT DO NOTHING`,
        { pid: publication.id, tid: tag.id },
      );
    }

    // §4: archivar el contenido público anterior para que deje de mostrarse.
    await query(
      queryInterface,
      `UPDATE content_publications
       SET status = 'ARCHIVED', updated_at = :now
       WHERE slug IN (:slugs) AND status <> 'ARCHIVED'`,
      { slugs: LEGACY_SLUGS, now },
    );
  },

  async down(queryInterface) {
    // Revertir: republicar lo demo y quitar el artículo nuevo.
    await queryInterface.sequelize.query(
      `UPDATE content_publications SET status = 'PUBLISHED' WHERE slug IN (${LEGACY_SLUGS.map((s) => `'${s}'`).join(',')});`,
    );
    await queryInterface.sequelize.query(
      `DELETE FROM content_publication_tags WHERE publication_id IN (SELECT id FROM content_publications WHERE slug = '${ARTICLE.slug}');`,
    );
    await queryInterface.sequelize.query(
      `DELETE FROM content_publications WHERE slug = '${ARTICLE.slug}';`,
    );
    await queryInterface.sequelize.query(
      `DELETE FROM content_categories WHERE slug = 'preparacion-y-bienestar';`,
    );
  },
};
