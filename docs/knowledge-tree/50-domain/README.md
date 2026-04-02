# 50-domain — Israeli Banking Domain Glossary

## Major Israeli Banks

| Name | Hebrew | Notes |
|---|---|---|
| Bank Hapoalim | בנק הפועלים | Largest bank in Israel |
| Bank Leumi | בנק לאומי | Second largest |
| Bank Discount | בנק דיסקונט | |
| Mizrahi Tefahot | מזרחי טפחות | |
| First International (Fibi) | הבנק הבינלאומי | |

## Major Credit Card Networks

| Name | Notes |
|---|---|
| Max (formerly Leumi Card) | Largest credit network; formerly associated with Leumi |
| Cal (Visa Cal) | Operated by Discount and Fibi |
| Isracard | Associated with Hapoalim; issues Isracard and Amex |
| Amex Israel | Issued through Isracard |

## Key Transaction Concepts

**חיוב מיידי (Immediate charge)**: The transaction amount is debited from the bank account on the same business day. Common for debit cards.

**חיוב נדחה (Deferred charge)**: The amount is accumulated during the month and debited in a single batch on a fixed date (the charge date). This is the default behavior for most Israeli credit cards and is critical for correct cash-flow modeling.

**מועד חיוב (Charge date)**: The calendar date when the credit card issuer actually debits the linked bank account. This is distinct from the transaction date and typically falls on a fixed day of the month (e.g., the 10th or 15th). Pocket must model both dates.

**מקור (Source)**: The institution that originated the transaction record.

## Currency

**ILS (₪)** — Israeli New Shekel. Primary currency for all domestic transactions. USD amounts appear in foreign-currency card transactions.

## Scraper Coverage

Supported institutions are listed in the scraper submodule:
`external/israeli-bank-scrapers/README.md`

## Legal Note

Screen-scraping of personal banking data by the account holder is a legally contested area in Israel. Users are responsible for complying with their bank's terms of service. Pocket does not provide legal advice. The app accesses only data the user has authorization to access.
