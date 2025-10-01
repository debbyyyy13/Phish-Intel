import re
import email
import whois
import dns.resolver
from urllib.parse import urlparse
from datetime import datetime
from email.utils import parseaddr

def get_domain_age(domain: str) -> int:
    """Lookup domain age in days using WHOIS"""
    try:
        w = whois.whois(domain)
        if isinstance(w.creation_date, list):
            creation_date = w.creation_date[0]
        else:
            creation_date = w.creation_date

        if not creation_date:
            return 0

        age_days = (datetime.now() - creation_date).days
        return age_days if age_days >= 0 else 0
    except Exception:
        return 0

def check_spf(domain: str) -> int:
    """Very basic SPF check: does domain publish SPF record?"""
    try:
        answers = dns.resolver.resolve(domain, "TXT")
        for rdata in answers:
            if "v=spf1" in str(rdata):
                return 1
        return 0
    except Exception:
        return 0

def check_dkim(headers: dict) -> int:
    """Check if DKIM-Signature header is present"""
    return 1 if "dkim-signature" in (h.lower() for h in headers.keys()) else 0

def has_display_name_mismatch(from_header: str) -> int:
    """Check if display name mismatches actual email domain"""
    name, addr = parseaddr(from_header)
    if not addr or "@" not in addr:
        return 0
    domain = addr.split("@")[-1].lower()
    return 1 if domain not in name.lower() else 0

def extract_features(raw_email: str) -> dict:
    """
    Convert raw email (headers + body) into structured features
    """
    msg = email.message_from_string(raw_email)
    headers = dict(msg.items())
    body = msg.get_payload(decode=True)
    if body:
        try:
            body = body.decode(errors="ignore")
        except Exception:
            body = str(body)
    else:
        body = ""

    text = body.lower()

    # Links
    urls = re.findall(r'(https?://\S+)', text)
    num_links = len(urls)
    num_external_links = sum(1 for u in urls if "yourdomain.com" not in u)
    has_shortened_urls = any(any(short in u for short in ["bit.ly", "tinyurl", "goo.gl"]) for u in urls)

    # Attachments
    has_suspicious_attachments = int(bool(re.search(r'\.(exe|scr|zip|rar|7z)', text)))

    # Suspicious TLDs
    suspicious_tlds = [".ru", ".cn", ".tk", ".xyz"]
    has_suspicious_tld = int(any(u.endswith(tld) for tld in suspicious_tlds for u in urls))

    # Hidden text
    has_hidden_text = int("font-size:0" in text or "color:#fff" in text)

    # Images
    num_images = text.count("<img")

    # Subject length
    subject = headers.get("Subject", "")
    subject_length = len(subject)
    body_length = len(body)

    # Keywords
    urgent_keywords = ["urgent", "immediately", "action required", "important"]
    financial_keywords = ["invoice", "payment", "bank", "account", "password"]
    has_urgent_keywords = int(any(k in text for k in urgent_keywords))
    has_financial_keywords = int(any(k in text for k in financial_keywords))

    # Reply detection
    is_reply = int(subject.lower().startswith("re:"))

    # Time of day (from Date header)
    time_of_day = 12
    if "Date" in headers:
        try:
            parsed_date = email.utils.parsedate_to_datetime(headers["Date"])
            time_of_day = parsed_date.hour
        except Exception:
            pass

    # SPF/DKIM/WHOIS
    sender = headers.get("From", "")
    _, addr = parseaddr(sender)
    domain = addr.split("@")[-1].lower() if "@" in addr else ""

    sender_domain_age = get_domain_age(domain) if domain else 0
    spf_pass = check_spf(domain) if domain else 0
    dkim_pass = check_dkim(headers)

    return {
        "has_suspicious_tld": has_suspicious_tld,
        "sender_domain_age": sender_domain_age,
        "has_display_name_mismatch": has_display_name_mismatch(sender),
        "subject_length": subject_length,
        "body_length": body_length,
        "has_urgent_keywords": has_urgent_keywords,
        "has_financial_keywords": has_financial_keywords,
        "num_links": num_links,
        "num_external_links": num_external_links,
        "has_shortened_urls": int(has_shortened_urls),
        "has_suspicious_attachments": has_suspicious_attachments,
        "html_to_text_ratio": round(text.count("<") / max(1, len(text)), 2),
        "has_hidden_text": has_hidden_text,
        "num_images": num_images,
        "is_reply": is_reply,
        "time_of_day": time_of_day,
        "has_spf_pass": spf_pass,
        "has_dkim_pass": dkim_pass,
    }
