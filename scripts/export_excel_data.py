import io
import os
import csv
import zipfile
import math
import random

def create_simple_xlsx(filename, sheet_name, headers, rows):
    """Builds an authentic, compliant ECMA-376 .xlsx file using Python's standard library."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        content_types = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
            '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n'
            '  <Default Extension="xml" ContentType="application/xml"/>\n'
            '  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n'
            '  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n'
            '  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\n'
            '</Types>'
        )
        z.writestr('[Content_Types].xml', content_types)

        rels = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
            '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n'
            '</Relationships>'
        )
        z.writestr('_rels/.rels', rels)

        wb_rels = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
            '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>\n'
            '  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n'
            '</Relationships>'
        )
        z.writestr('xl/_rels/workbook.xml.rels', wb_rels)

        styles = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n'
            '  <fonts count="2">\n'
            '    <font><sz val="11"/><name val="Calibri"/></font>\n'
            '    <font><b/><sz val="11"/><name val="Calibri"/><color rgb="FF000000"/></font>\n'
            '  </fonts>\n'
            '  <fills count="3">\n'
            '    <fill><patternFill patternType="none"/></fill>\n'
            '    <fill><patternFill patternType="gray125"/></fill>\n'
            '    <fill><patternFill patternType="solid"><fgColor rgb="FFEAEAEA"/></patternFill></fill>\n'
            '  </fills>\n'
            '  <borders count="1">\n'
            '    <border><left/><right/><top/><bottom/></border>\n'
            '  </borders>\n'
            '  <cellStyleXfs count="1">\n'
            '    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>\n'
            '  </cellStyleXfs>\n'
            '  <cellXfs count="2">\n'
            '    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>\n'
            '    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>\n'
            '  </cellXfs>\n'
            '</styleSheet>'
        )
        z.writestr('xl/styles.xml', styles)

        wb = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n'
            '  <sheets>\n'
            f'    <sheet name="{sheet_name}" sheetId="1" r:id="rId1"/>\n'
            '  </sheets>\n'
            '</workbook>'
        )
        z.writestr('xl/workbook.xml', wb)

        def col_name(n):
            name = ''
            while n > 0:
                n, rem = divmod(n - 1, 26)
                name = chr(65 + rem) + name
            return name

        sheet_rows = []
        hdr_cells = []
        for c_idx, h in enumerate(headers, 1):
            cn = col_name(c_idx)
            safe_h = str(h).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            hdr_cells.append(f'<c r="{cn}1" t="inlineStr" s="1"><is><t>{safe_h}</t></is></c>')
        sheet_rows.append('<row r="1">' + ''.join(hdr_cells) + '</row>')

        for r_idx, row in enumerate(rows, 2):
            cells = []
            for c_idx, val in enumerate(row, 1):
                cn = col_name(c_idx)
                if val is None:
                    continue
                if isinstance(val, (int, float)) and not math.isnan(val):
                    cells.append(f'<c r="{cn}{r_idx}"><v>{val}</v></c>')
                else:
                    safe_val = str(val).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    cells.append(f'<c r="{cn}{r_idx}" t="inlineStr"><is><t>{safe_val}</t></is></c>')
            sheet_rows.append(f'<row r="{r_idx}">' + ''.join(cells) + '</row>')

        ws = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n'
            '  <sheetData>\n'
            f'    {"".join(sheet_rows)}\n'
            '  </sheetData>\n'
            '</worksheet>'
        )
        z.writestr('xl/worksheets/sheet1.xml', ws)

    with open(filename, 'wb') as f:
        f.write(buf.getvalue())
    print(f"Generated {filename}")

def csv_to_rows(csv_path):
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
        rows = []
        for r in reader:
            parsed = []
            for item in r:
                try:
                    if '.' in item:
                        parsed.append(float(item))
                    else:
                        parsed.append(int(item))
                except ValueError:
                    parsed.append(item)
            rows.append(parsed)
        return headers, rows

if __name__ == "__main__":
    os.makedirs('data', exist_ok=True)
    # Convert CSVs to local Excel files in data/ directory
    for name in ['vasanthapura_schools_530', 'vasanthapura_demo_100', 'vasanthapura_demo_45', 'fleet_config']:
        csv_file = f'data/{name}.csv'
        if os.path.exists(csv_file):
            headers, rows = csv_to_rows(csv_file)
            create_simple_xlsx(f'data/{name}.xlsx', 'Sheet1', headers, rows)

    # data.xlsx is the primary operational file initialized with 100 schools (in data/ and root)
    if os.path.exists('data/vasanthapura_demo_100.csv'):
        headers, rows = csv_to_rows('data/vasanthapura_demo_100.csv')
        create_simple_xlsx('data/data.xlsx', 'Sheet1', headers, rows)
        create_simple_xlsx('data.xlsx', 'Sheet1', headers, rows)
        print("Generated primary operational data.xlsx")

    print("All Excel workbooks created successfully!")
