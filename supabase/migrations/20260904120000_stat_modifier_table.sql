-- Modifier from enhanced stat: +1 for 1–2, +2 for 3–5, +3 for 6–9, +4 for 10–14, +5 for 15–20, then +1 range width each step.
CREATE OR REPLACE FUNCTION stat_modifier(stat_value INT)
RETURNS INT AS $$
BEGIN
  IF stat_value IS NULL OR stat_value <= 0 THEN
    RETURN 0;
  END IF;
  RETURN CEIL((-3 + SQRT(9::numeric + 8 * stat_value)) / 2)::INT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
