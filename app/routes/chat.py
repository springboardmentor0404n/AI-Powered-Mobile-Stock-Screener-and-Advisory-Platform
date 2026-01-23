from flask import Blueprint, request, jsonify
from app.llm.parser import parse_query
from app.screener.runner import run_screener
from app.services.chat_intelligence import handle_small_talk

chat_bp = Blueprint("chat_bp", __name__)

def apply_intent_sorting(results, intent):
    if not intent: return results
    
    # Precise sorting rules for all performance intents
    sort_config = {
        "high_volume": {"field": "volume", "reverse": True},
        "low_volume":  {"field": "volume", "reverse": False},  # Ascending for Low Volume
        "high_price":  {"field": "close",  "reverse": True},
        "low_price":   {"field": "close",  "reverse": False}, # Ascending for Low Price
        "high_performance": {"field": "percent_return", "reverse": True}
    }
    
    config = sort_config.get(intent)
    if config:
        field = config["field"]
        rev = config["reverse"]
        # Use safe float conversion for sorting stability
        return sorted(results, key=lambda x: float(x.get(field, 0)), reverse=rev)
    return results

@chat_bp.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    query = data.get("message") or data.get("query")
    
    talk = handle_small_talk(query)
    if talk: return jsonify({"message": talk["response"], "data": []})

    parsed = parse_query(query)
    
    # If parsing failed to find any meaningful intent or filters, and it's just a general word
    # that isn't explicitly asking for "all stocks", we should ask for clarification.
    # We allow "stocks" or "all" to pass through as a request for the full list.
    is_explicit_request = any(w in query.lower() for w in ["stock", "stocks", "all", "list", "show"])
    
    if parsed["intent"] == "general" and not parsed["filters"] and not parsed["keywords"] and not is_explicit_request:
         return jsonify({
            "message": "I didn't quite catch that. Could you be more specific? You can ask for 'high price stocks', 'volume leaders', etc.",
            "data": [],
            "intent": "clarification",
            "quarters": None
        })

    results = run_screener(parsed.get("filters", []), parsed.get("keywords"), quarters=parsed.get("quarters"))
    
    # Apply the new directional sorting
    sorted_results = apply_intent_sorting(results, parsed.get("intent"))
    
    limit = parsed.get("limit")
    if limit is None:
        limit = len(sorted_results) # Show all if no limit specified
    else:
        limit = int(limit)

    return jsonify({
        "message": f"Analyzing {len(sorted_results)} stocks based on your query.",
        "data": sorted_results[:limit],
        "intent": parsed.get("intent"),
        "quarters": parsed.get("quarters")
    })