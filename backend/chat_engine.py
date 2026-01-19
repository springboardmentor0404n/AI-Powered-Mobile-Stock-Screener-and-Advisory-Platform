def answer_question(question, df):
    q = question.lower()

    if "top" in q or "expensive" in q:
        top = df.sort_values("Close", ascending=False).head(5)
        names = ", ".join(top["Symbol"].tolist())
        return f"Top expensive stocks currently are: {names}"

    if "cheap" in q or "low price" in q:
        low = df.sort_values("Close").head(5)
        names = ", ".join(low["Symbol"].tolist())
        return f"Lowest priced stocks currently are: {names}"

    if "bank" in q:
        banks = df[df["Symbol"].str.contains("BANK", na=False)].head(5)
        return "Top banking stocks: " + ", ".join(banks["Symbol"].tolist())

    if "it" in q or "tech" in q:
        it = df[df["Symbol"].str.contains("INFY|TCS|TECH", na=False)]
        return "IT stocks include: " + ", ".join(it["Symbol"].head(5).tolist())

    return (
        "This is an AI market assistant. "
        "You can ask about top stocks, banking stocks, IT stocks, cheap stocks, prices, trends, etc."
    )
