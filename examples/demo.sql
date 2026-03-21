-- Example: Mermaid diagram in a SQL file

-- @mermaid
-- erDiagram
--   USER ||--o{ ORDER : places
--   ORDER ||--|{ LINE_ITEM : contains
--   PRODUCT ||--o{ LINE_ITEM : includes
-- @end-mermaid

SELECT * FROM users;
