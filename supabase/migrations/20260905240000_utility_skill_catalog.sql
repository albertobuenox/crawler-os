-- Skills de public/skills/utility que no estaban en el catálogo d100.
-- No ocupan tirada (roll 0–0). pickSkillByRoll las ignora.

INSERT INTO skill_catalog (slug, name, roll_min, roll_max, page_ref, animal_only, kind, description)
VALUES
  ('acute-ears', 'Acute Ears', 0, 0, 0, false, 'destreza', $$Oyes lo que no deberían oír. Pasos, susurros, el clic de una trampa.$$),
  ('alchemy', 'Alchemy', 0, 0, 0, false, 'apoyo', $$Mezclas, destilas y conviertes basura en algo que explota o cura.$$),
  ('arcane', 'Arcane', 0, 0, 0, false, 'apoyo', $$Lectura de runas, residuales mágicos y por qué esa puerta zumba.$$),
  ('attack-of-opportunity', 'Attack of Opportunity', 0, 0, 0, false, 'ataque', $$Si alguien baja la guardia a tu lado, el Sistema te deja morder.$$),
  ('backfire', 'Backfire', 0, 0, 0, false, 'ataque', $$Cuando el plan sale mal, sales tú peor. O el enemigo. A veces ambos.$$),
  ('balance', 'Balance', 0, 0, 0, false, 'destreza', $$Cornisas, puentes rotos y techos que no deberían aguantarte.$$),
  ('basic-science', 'Basic Science', 0, 0, 0, false, 'apoyo', $$Física de instituto aplicada a no morir. Palancas, ácidos, gravedad.$$),
  ('calligraphy', 'Calligraphy', 0, 0, 0, false, 'apoyo', $$Letras que importan: contratos, sellos, runas mal copiadas.$$),
  ('cartography', 'Cartography', 0, 0, 0, false, 'apoyo', $$Mapas que no mienten del todo. Marcas lo que el piso quiere ocultar.$$),
  ('cat-like-reflexes', 'Cat-like Reflexes', 0, 0, 0, false, 'destreza', $$El cuerpo se mueve antes que el cerebro. A veces a tiempo.$$),
  ('cesta-punta', 'Cesta Punta', 0, 0, 0, false, 'destreza', $$Jai alai. Cesta, pelota, pared. Velocidad que parte huesos.$$),
  ('character-actor', 'Character Actor', 0, 0, 0, false, 'apoyo', $$Caras, voces, acentos. Eres quien haga falta hasta que te pillen.$$),
  ('cockroach', 'Cockroach', 0, 0, 0, false, 'defensa', $$Difícil de matar. Te escondes, aguantas y sales de debajo del zapato.$$),
  ('cooking', 'Cooking', 0, 0, 0, false, 'apoyo', $$Comida que no mata. A veces hasta cura. El Sistema lo nota.$$),
  ('diplomacy', 'Diplomacy', 0, 0, 0, false, 'apoyo', $$Hablar para que no te disparen. O para que disparen a otro.$$),
  ('double-tap', 'Double Tap', 0, 0, 0, false, 'ataque', $$El segundo disparo es por si el primero fue optimista.$$),
  ('escape-plan', 'Escape Plan', 0, 0, 0, false, 'destreza', $$Siempre hay una salida. Esta skill es encontrarla antes que el humo.$$),
  ('find-trap', 'Find Trap', 0, 0, 0, false, 'destreza', $$No es desactivarla. Es verla. Eso ya es mucho.$$),
  ('gear-head', 'Gear Head', 0, 0, 0, false, 'apoyo', $$Motores, engranajes, cacharros terrestres que el Sistema no entiende.$$),
  ('improvised-explosive-device', 'Improvised Explosive Device', 0, 0, 0, false, 'ataque', $$Con lo que hay a mano. El radio de explosión es una sugerencia.$$),
  ('infusion', 'Infusion', 0, 0, 0, false, 'apoyo', $$Meter magia, veneno o suerte en un objeto. El resultado varía.$$),
  ('iron-stomach', 'Iron Stomach', 0, 0, 0, false, 'defensa', $$Comes lo que sea. El veneno tarda más. El asco, también.$$),
  ('leadership', 'Leadership', 0, 0, 0, false, 'apoyo', $$La gente te sigue. A veces al sitio correcto.$$),
  ('lore', 'Lore', 0, 0, 0, false, 'apoyo', $$Lo que el dungeon ya contó a otro. Historia, facciones, chismes letales.$$),
  ('pathfinder', 'Pathfinder', 0, 0, 0, false, 'destreza', $$El camino menos estúpido. Atajos, rastros, no perderse.$$),
  ('religion', 'Religion', 0, 0, 0, false, 'apoyo', $$Dioses, cultos, ofrendas. Saber a quién no insultar.$$),
  ('riding', 'Riding', 0, 0, 0, false, 'destreza', $$Monturas, bestias y lo que se deje. No caerte es el principio.$$),
  ('ropework', 'Ropework', 0, 0, 0, false, 'destreza', $$Nudos, tirolinas, atar y desatar antes de que cuente.$$),
  ('scutelliphily', 'Scutelliphily', 0, 0, 0, false, 'apoyo', $$Coleccionar parches. El hobby existe. El Sistema lo toma en serio.$$),
  ('shield-block', 'Shield Block', 0, 0, 0, false, 'defensa', $$El escudo está para eso. El brazo, también.$$),
  ('smithing', 'Smithing', 0, 0, 0, false, 'apoyo', $$Forja, remiendos de metal, filos que vuelven a cortar.$$),
  ('tattoo-artistry', 'Tattoo Artistry', 0, 0, 0, false, 'apoyo', $$Tinta en piel. A veces es arte. A veces es un hechizo que no se va.$$),
  ('trap-engineer', 'Trap Engineer', 0, 0, 0, false, 'apoyo', $$Ponerlas, no solo verlas. El pasillo se vuelve tuyo.$$),
  ('zone-of-control', 'Zone of Control', 0, 0, 0, false, 'ataque', $$El espacio a tu alrededor es tuyo. Quien entre, paga.$$)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  description = CASE
    WHEN skill_catalog.description IS NULL OR skill_catalog.description = '' THEN EXCLUDED.description
    ELSE skill_catalog.description
  END;
