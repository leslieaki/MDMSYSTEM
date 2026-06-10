import type {
  MdmQualityIssue,
  MdmQualityReport,
  MdmQualityReportRepository
} from "../../domain/repositories/MdmQualityReportRepository";
import { postgresPool } from "../database/PostgresConnection";

type QualityCountersRow = {
  total_parts: string;
  parts_without_drawing_file: string;
  incomplete_parts: string;
  low_stock_parts: string;
  deficit_parts: string;
  reference_mismatch_parts: string;
  duplicate_name_groups: string;
};

function toNumber(value: string | number | null): number {
  if (value === null) {
    return 0;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function createIssue(
  code: string,
  title: string,
  description: string,
  severity: MdmQualityIssue["severity"],
  affectedCount: number,
  targetPage: string
): MdmQualityIssue | null {
  if (affectedCount <= 0) {
    return null;
  }

  return {
    code,
    title,
    description,
    severity,
    affectedCount,
    targetPage
  };
}

function calculateQualityScore(row: QualityCountersRow): number {
  const totalParts = Math.max(toNumber(row.total_parts), 1);

  const penalty =
    toNumber(row.parts_without_drawing_file) * 2 +
    toNumber(row.incomplete_parts) * 4 +
    toNumber(row.low_stock_parts) * 1 +
    toNumber(row.deficit_parts) * 3 +
    toNumber(row.reference_mismatch_parts) * 4 +
    toNumber(row.duplicate_name_groups) * 3;

  const maxPenalty = totalParts * 6;
  const score = 100 - Math.round((penalty / maxPenalty) * 100);

  return Math.max(0, Math.min(100, score));
}

export class PostgresMdmQualityReportRepository
  implements MdmQualityReportRepository
{
  async getQualityReport(): Promise<MdmQualityReport> {
    const result = await postgresPool.query<QualityCountersRow>(`
      WITH duplicate_names AS (
        SELECT LOWER(TRIM(name)) AS normalized_name
        FROM parts
        GROUP BY LOWER(TRIM(name))
        HAVING COUNT(*) > 1
      )
      SELECT
        COUNT(p.id)::text AS total_parts,
        COUNT(p.id) FILTER (
          WHERE df.id IS NULL
        )::text AS parts_without_drawing_file,
        COUNT(p.id) FILTER (
          WHERE
            TRIM(p.code) = ''
            OR TRIM(p.name) = ''
            OR TRIM(p.category) = ''
            OR TRIM(p.material) = ''
            OR TRIM(p.unit) = ''
            OR TRIM(p.supplier) = ''
            OR TRIM(p.drawing) = ''
        )::text AS incomplete_parts,
        COUNT(p.id) FILTER (
          WHERE p.stock > 0 AND p.stock < p.min_stock
        )::text AS low_stock_parts,
        COUNT(p.id) FILTER (
          WHERE p.stock <= 0
        )::text AS deficit_parts,
        COUNT(p.id) FILTER (
          WHERE
            pc.id IS NULL
            OR m.id IS NULL
            OR s.id IS NULL
            OR mu.id IS NULL
        )::text AS reference_mismatch_parts,
        (
          SELECT COUNT(*)::text
          FROM duplicate_names
        ) AS duplicate_name_groups
      FROM parts p
      LEFT JOIN part_drawing_files df ON df.part_id = p.id
      LEFT JOIN part_categories pc ON LOWER(pc.name) = LOWER(p.category)
      LEFT JOIN materials m ON LOWER(m.name) = LOWER(p.material)
      LEFT JOIN suppliers s ON LOWER(s.name) = LOWER(p.supplier)
      LEFT JOIN measurement_units mu ON LOWER(mu.name) = LOWER(p.unit)
    `);

    const row = result.rows[0] ?? {
      total_parts: "0",
      parts_without_drawing_file: "0",
      incomplete_parts: "0",
      low_stock_parts: "0",
      deficit_parts: "0",
      reference_mismatch_parts: "0",
      duplicate_name_groups: "0"
    };

    const issues = [
      createIssue(
        "parts_without_drawing_file",
        "Карточки без файла чертежа",
        "Номенклатурные позиции должны иметь прикрепленный файл чертежа для производственного контроля.",
        "warning",
        toNumber(row.parts_without_drawing_file),
        "drawings"
      ),
      createIssue(
        "incomplete_parts",
        "Неполные карточки деталей",
        "В карточках найдены пустые обязательные поля мастер-данных.",
        "critical",
        toNumber(row.incomplete_parts),
        "parts"
      ),
      createIssue(
        "low_stock_parts",
        "Позиции с низким остатком",
        "Остаток ниже минимального уровня, требуется контроль закупки или пополнения.",
        "warning",
        toNumber(row.low_stock_parts),
        "warehouse"
      ),
      createIssue(
        "deficit_parts",
        "Дефицитные позиции",
        "Остаток равен нулю или ниже, возможна остановка производственного процесса.",
        "critical",
        toNumber(row.deficit_parts),
        "warehouse"
      ),
      createIssue(
        "reference_mismatch_parts",
        "Несоответствие справочникам",
        "В карточках есть значения, которые не найдены в управляемых справочниках НСИ.",
        "critical",
        toNumber(row.reference_mismatch_parts),
        "admin"
      ),
      createIssue(
        "duplicate_name_groups",
        "Возможные дубли номенклатуры",
        "Найдены группы карточек с одинаковыми наименованиями, требуется проверка на дублирование.",
        "warning",
        toNumber(row.duplicate_name_groups),
        "parts"
      )
    ].filter((issue): issue is MdmQualityIssue => issue !== null);

    return {
      generatedAt: new Date().toISOString(),
      totalParts: toNumber(row.total_parts),
      qualityScore: calculateQualityScore(row),
      summary: {
        criticalIssues: issues.filter((issue) => issue.severity === "critical")
          .length,
        warningIssues: issues.filter((issue) => issue.severity === "warning")
          .length,
        infoIssues: issues.filter((issue) => issue.severity === "info").length,
        affectedObjects: issues.reduce(
          (sum, issue) => sum + issue.affectedCount,
          0
        )
      },
      issues
    };
  }
}
