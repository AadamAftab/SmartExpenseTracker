import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

CATEGORIES = [
    "Food", "Travel", "Shopping", "Entertainment",
    "Bills", "Health", "Education", "Investment", "Income", "Other"
]

RULES = {
    # Food
    "zomato": "Food", "swiggy": "Food", "dominos": "Food", "domino": "Food",
    "mcdonald": "Food", "burger king": "Food", "kfc": "Food", "subway": "Food",
    "pizza": "Food", "cafe": "Food", "restaurant": "Food", "hotel": "Food",
    "blinkit": "Food", "bigbasket": "Food", "zepto": "Food", "instamart": "Food",

    # Travel
    "uber": "Travel", "ola": "Travel", "rapido": "Travel", "irctc": "Travel",
    "makemytrip": "Travel", "goibibo": "Travel", "redbus": "Travel",
    "indigo": "Travel", "spicejet": "Travel", "air india": "Travel",
    "metro": "Travel", "petrol": "Travel", "fuel": "Travel",

    # Shopping
    "amazon": "Shopping", "flipkart": "Shopping", "myntra": "Shopping",
    "meesho": "Shopping", "ajio": "Shopping", "nykaa": "Shopping",
    "reliance": "Shopping", "dmart": "Shopping", "decathlon": "Shopping",

    # Entertainment
    "netflix": "Entertainment", "spotify": "Entertainment", "youtube": "Entertainment",
    "hotstar": "Entertainment", "prime video": "Entertainment", "zee5": "Entertainment",
    "sonyliv": "Entertainment", "bookmyshow": "Entertainment", "pvr": "Entertainment",
    "inox": "Entertainment", "gaming": "Entertainment", "steam": "Entertainment",

    # Bills
    "electricity": "Bills", "airtel": "Bills", "jio": "Bills", "bsnl": "Bills",
    "vi ": "Bills", "vodafone": "Bills", "water bill": "Bills", "gas": "Bills",
    "broadband": "Bills", "recharge": "Bills", "postpaid": "Bills",

    # Health
    "pharmacy": "Health", "hospital": "Health", "clinic": "Health", "doctor": "Health",
    "apollo": "Health", "medplus": "Health", "1mg": "Health", "netmeds": "Health",
    "gym": "Health", "cult.fit": "Health", "healthifyme": "Health",

    # Education
    "udemy": "Education", "coursera": "Education", "unacademy": "Education",
    "byjus": "Education", "school": "Education", "college": "Education",
    "university": "Education", "book": "Education", "stationery": "Education",

    # Investment
    "zerodha": "Investment", "groww": "Investment", "upstox": "Investment",
    "mutual fund": "Investment", "sip": "Investment", "stock": "Investment",
    "coin": "Investment", "smallcase": "Investment",

    # Income
    "salary": "Income", "credited": "Income", "neft": "Income",
    "imps": "Income", "rtgs": "Income", "refund": "Income",
    "cashback": "Income", "bonus": "Income", "freelance": "Income",
}

def rule_based_category(merchant: str) -> str | None:
    if not merchant:
        return None
    m = merchant.lower().strip()
    for keyword, category in RULES.items():
        if keyword in m:
            return category
    return None

def ai_categorize(merchant: str) -> str:
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""You are a financial transaction categorizer.
Given a merchant name, return ONLY one category from this list:
{", ".join(CATEGORIES)}

Merchant: {merchant}

Reply with just the category name, nothing else."""

        response = model.generate_content(prompt)
        result = response.text.strip()

        if result in CATEGORIES:
            return result
        # Try to match partially
        for cat in CATEGORIES:
            if cat.lower() in result.lower():
                return cat
        return "Other"
    except Exception:
        return "Other"

def categorize(merchant: str) -> str:
    rule = rule_based_category(merchant)
    if rule:
        return rule
    return ai_categorize(merchant)