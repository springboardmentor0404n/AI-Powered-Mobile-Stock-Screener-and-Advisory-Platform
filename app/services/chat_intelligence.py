def handle_small_talk(query: str):
    q = query.lower().strip()

    greetings = {"hi", "hello", "hey", "hii", "hlo", "help", "who are you"}
    
    # 🚫 If query contains stock-related words, DO NOT greet (unless it's just "help")
    stock_words = {"stock", "stocks", "price", "volume", "high", "low", "top", "below", "above"}
    
    # If the user asks "why" or "what happened" specifically
    if query.lower().strip() in ["why", "why?", "what", "what?"]:
         return {
            "response": "I can help you screen stocks based on price, volume, and performance. Try asking 'show me stocks above 500' or 'high volume stocks'."
         }
         
    # Handle gratitude and closing
    gratitude = {"thank you", "thanks", "thx", "good job", "great"}
    closing = {"bye", "goodbye", "see you", "exit"}
    
    if any(g in q for g in gratitude):
        return {
            "response": "You're welcome! Happy investing! 🚀"
        }
        
    if any(c in q for c in closing):
         return {
            "response": "Goodbye! Have a profitable day! 📈"
        }

    if q in greetings:
        return {
            "response": (
                "Hi 👋 I’m your AI Stock Screener. You can ask me to find stocks based on price, volume, or technical indicators.\n"
                "Examples: 'low price stocks', 'stocks above 1000', 'high volume'."
            )
        }

    return None
