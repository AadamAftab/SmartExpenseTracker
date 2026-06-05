from google import genai
from google.genai import types
from dotenv import load_dotenv
import os

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

CATEGORIES = [
    "Food", "Travel", "Shopping", "Entertainment",
    "Bills", "Health", "Education", "Investment", "Income", "Other"
]

RULES = {
    # Food
    "zomato": "Food", "swiggy": "Food", "dominos": "Food", "domino": "Food",
    "mcdonald": "Food", "burger king": "Food", "kfc": "Food", "subway": "Food",
    "pizza": "Food", "cafe": "Food", "restaurant": "Food",
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
    "inox": "Entertainment", "steam": "Entertainment",

    # Bills
    "electricity": "Bills", "airtel": "Bills", "jio": "Bills", "bsnl": "Bills",
    "vodafone": "Bills", "water bill": "Bills", "broadband": "Bills",
    "recharge": "Bills", "postpaid": "Bills",

    # Health
    "pharmacy": "Health", "hospital": "Health", "clinic": "Health", "doctor": "Health",
    "apollo": "Health", "medplus": "Health", "1mg": "Health", "netmeds": "Health",
    "gym": "Health", "cult.fit": "Health",

    # Education
    "udemy": "Education", "coursera": "Education", "unacademy": "Education",
    "byjus": "Education", "school": "Education", "college": "Education",

    # Investment
    "zerodha": "Investment", "groww": "Investment", "upstox": "Investment",
    "mutual fund": "Investment", "sip": "Investment",

    # Income
    "salary": "Income", "credited": "Income", "neft": "Income",
    "imps": "Income", "rtgs": "Income", "refund": "Income",
    "cashback": "Income", "bonus": "Income",
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
        prompt = f"""You are a financial transaction categorizer.
Given a merchant name, return ONLY one category from this list:
{", ".join(CATEGORIES)}

Merchant: {merchant}

Reply with just the category name, nothing else."""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        result = response.text.strip()

        if result in CATEGORIES:
            return result
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