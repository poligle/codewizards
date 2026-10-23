import csv
import io


def sum_column(csv_text, column):
    rows = csv.DictReader(io.StringIO(csv_text))
    if column not in (rows.fieldnames or []):
        raise KeyError(column)
    return float(sum(float(r[column]) for r in rows if r[column] not in (None, '')))
