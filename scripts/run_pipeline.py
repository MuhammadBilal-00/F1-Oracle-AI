"""Master ETL pipeline runner — Phase 1."""
import sys
import time
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("f1_pipeline")

from ml.data_pipeline.extract.loader import load_all_raw
from ml.data_pipeline.transform.cleaner import clean_all
from ml.data_pipeline.load.db_loader import create_schema, truncate_all, load_dimensions, load_facts


def run():
    start = time.time()
    logger.info("=" * 60)
    logger.info("F1 Oracle AI — Data Pipeline Starting")
    logger.info("=" * 60)

    # Phase 1: Extract
    logger.info("\n[EXTRACT] Loading raw CSV files...")
    raw, quality_reports = load_all_raw()
    logger.info(f"Extract complete: {len(raw)} tables loaded")

    # Phase 2: Transform
    logger.info("\n[TRANSFORM] Cleaning & transforming data...")
    clean = clean_all(raw)
    logger.info("Transform complete")

    # Phase 3: Load
    logger.info("\n[LOAD] Loading into data warehouse...")
    create_schema()
    truncate_all()
    dim_counts = load_dimensions(clean)
    fact_counts = load_facts(clean)
    logger.info("Load complete")

    elapsed = time.time() - start

    logger.info("\n" + "=" * 60)
    logger.info(f"Pipeline finished in {elapsed:.1f}s")
    logger.info("\nDimension Records:")
    for k, v in dim_counts.items():
        logger.info(f"  {k:30s}: {v:>8,}")
    logger.info("\nFact Records:")
    for k, v in fact_counts.items():
        logger.info(f"  {k:30s}: {v:>8,}")
    logger.info("=" * 60)

    # Quality summary
    logger.info("\nData Quality Summary:")
    for name, report in quality_reports.items():
        if report.issues:
            logger.warning(f"  {name}: {', '.join(report.issues)}")
        else:
            logger.info(f"  {name}: OK ({report.total_rows:,} rows)")

    return clean


if __name__ == "__main__":
    clean_data = run()
