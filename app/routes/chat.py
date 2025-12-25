from flask import Blueprint, request, jsonify
from app.llm.parser import parse_query
from app.screener.runner import run_screener
import traceback

chat_bp = Blueprint("chat_bp", __name__)

@chat_bp.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        query = data.get("query") or data.get("message")

        parsed = parse_query(query)
        results = run_screener(parsed.get("filters", []))

        return jsonify({
            "reply": results,
            "parsed_filters": parsed
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
