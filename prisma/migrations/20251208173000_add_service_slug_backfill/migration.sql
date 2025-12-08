-- Ajout slug sur Service avec reprise des données existantes
ALTER TABLE `Service` ADD COLUMN `slug` VARCHAR(191) NULL;

-- Génère un slug basique à partir du titre
UPDATE `Service` SET `slug` = LOWER(REPLACE(`title`, ' ', '-')) WHERE `slug` IS NULL;

-- Gère les doublons éventuels en suffixant l'id
UPDATE `Service` s
JOIN (
  SELECT slug FROM (
    SELECT slug FROM `Service` GROUP BY slug HAVING COUNT(*) > 1
  ) AS d
) dup ON dup.slug = s.slug
SET s.slug = CONCAT(s.slug, '-', s.id);

-- Valeur de secours si slug encore null
UPDATE `Service` SET `slug` = CONCAT('service-', id) WHERE `slug` IS NULL OR `slug` = '';

-- Rendre obligatoire et unique
ALTER TABLE `Service` MODIFY `slug` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `Service_slug_key` ON `Service`(`slug`);
