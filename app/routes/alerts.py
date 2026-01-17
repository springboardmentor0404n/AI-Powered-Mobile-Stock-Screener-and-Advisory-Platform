# alerts.py - UPDATED VERSION
from flask import Blueprint, request, jsonify
import json
from datetime import datetime, timedelta
from app.database.postgres import get_connection
from psycopg2.extras import RealDictCursor # Added for the notification routes

alerts_bp = Blueprint("alerts", __name__)

# Helper functions
def get_average_volume(symbol):
    """Helper function to get average volume for a symbol"""
    try:
        from app.routes.analytics import get_csv_data
        csv_data = get_csv_data(symbol)
        if csv_data:
            volumes = [item['volume'] for item in csv_data[-30:] if item.get('volume')]
            if volumes:
                return sum(volumes) / len(volumes)
    except Exception as e:
        print(f"Error getting average volume for {symbol}: {e}")
    return None

def get_db_connection():
    """Get database connection with fallback"""
    try:
        return get_connection()
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# ---------------- CREATE ALERT ----------------
@alerts_bp.route("/create", methods=["POST"])
def create_alert():
    try:
        data = request.get_json()
        
        # Debug: Print received data
        print(f"Alert creation request data: {data}")
        
        # Validate required fields
        required_fields = ["user_id", "symbol", "alert_type", "condition", "value"]
        missing_fields = []
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                missing_fields.append(field)
        
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "missing_fields": missing_fields
            }), 400
        
        user_id = data["user_id"]
        symbol = data["symbol"].strip().upper()
        alert_type = data["alert_type"].upper()
        condition = data["condition"].upper()
        
        # Convert value to float safely
        try:
            value = float(data["value"])
        except (ValueError, TypeError):
            return jsonify({"error": "Value must be a valid number"}), 400
        
        # Validate alert types
        valid_alert_types = ['PRICE_THRESHOLD', 'PERCENT_CHANGE', 'VOLUME_SPIKE']
        if alert_type not in valid_alert_types:
            return jsonify({
                "error": f"Invalid alert type. Must be one of: {valid_alert_types}",
                "received": alert_type
            }), 400
        
        # Validate conditions
        valid_conditions = ['ABOVE', 'BELOW', 'EQUALS']
        if condition not in valid_conditions:
            return jsonify({
                "error": f"Invalid condition. Must be one of: {valid_conditions}",
                "received": condition
            }), 400
        
        # Validate value based on type
        if alert_type == 'PERCENT_CHANGE' and (value <= 0 or value > 100):
            return jsonify({"error": "Percent change must be between 0.01 and 100"}), 400

        # Try database connection first
        conn = get_db_connection()
        
        if conn:
            try:
                cur = conn.cursor()

                # Check if similar alert already exists
                cur.execute("""
                    SELECT id FROM alerts 
                    WHERE user_id = %s AND symbol = %s AND alert_type = %s 
                    AND condition = %s AND value = %s AND is_active = true
                """, (user_id, symbol, alert_type, condition, value))
                
                existing = cur.fetchone()
                if existing:
                    cur.close()
                    conn.close()
                    return jsonify({"error": "Similar active alert already exists"}), 409

                cur.execute("""
                    INSERT INTO alerts (user_id, symbol, alert_type, condition, value, is_active, created_at)
                    VALUES (%s, %s, %s, %s, %s, true, %s)
                    RETURNING id, created_at
                """, (
                    user_id,
                    symbol,
                    alert_type,
                    condition,
                    value,
                    datetime.now()
                ))

                result = cur.fetchone()
                alert_id = result[0]
                created_at = result[1]
                conn.commit()

                cur.close()
                conn.close()

                return jsonify({
                    "message": "Alert created successfully",
                    "alert_id": alert_id,
                    "created_at": created_at.isoformat() if created_at else None,
                    "alert_details": {
                        "user_id": user_id,
                        "symbol": symbol,
                        "alert_type": alert_type,
                        "condition": condition,
                        "value": value,
                        "is_active": True
                    }
                }), 201
                
            except Exception as db_error:
                print(f"Database error during alert creation: {db_error}")
                # Fall through to mock response
                pass
        
        # If database fails or not available, return mock response
        return jsonify({
            "message": "Alert created successfully (mock)",
            "alert_id": 999,
            "created_at": datetime.now().isoformat(),
            "alert_details": {
                "user_id": user_id,
                "symbol": symbol,
                "alert_type": alert_type,
                "condition": condition,
                "value": value,
                "is_active": True
            },
            "note": "Using mock data - database not available"
        }), 201

    except Exception as e:
        print(f"Create alert error: {e}")
        return jsonify({"error": str(e)}), 500


# ---------------- GET ALL USER ALERTS ----------------
@alerts_bp.route("/user/<int:user_id>", methods=["GET"])
def get_user_alerts(user_id):
    try:
        conn = get_db_connection()
        
        if conn:
            try:
                cur = conn.cursor()

                cur.execute("""
                    SELECT 
                        a.*,
                        COUNT(ta.id) as times_triggered,
                        MAX(ta.triggered_at) as last_triggered
                    FROM alerts a
                    LEFT JOIN triggered_alerts ta ON a.id = ta.alert_id
                    WHERE a.user_id = %s
                    GROUP BY a.id
                    ORDER BY a.created_at DESC
                """, (user_id,))

                alerts = cur.fetchall()
                
                alerts_list = []
                for alert in alerts:
                    alerts_list.append({
                        "id": alert[0],
                        "user_id": alert[1],
                        "symbol": alert[2],
                        "alert_type": alert[3],
                        "condition": alert[4],
                        "value": float(alert[5]),
                        "is_active": alert[6],
                        "created_at": alert[7].isoformat() if alert[7] else None,
                        "updated_at": alert[8].isoformat() if alert[8] else None,
                        "times_triggered": alert[9],
                        "last_triggered": alert[10].isoformat() if alert[10] else None
                    })

                cur.close()
                conn.close()

                return jsonify({
                    "alerts": alerts_list,
                    "count": len(alerts_list),
                    "source": "database"
                })
                
            except Exception as db_error:
                print(f"Database error: {db_error}")
                # Fall through to mock data
        
        # Return mock data for development
        mock_alerts = [
            {
                "id": 1,
                "user_id": user_id,
                "symbol": "RELIANCE",
                "alert_type": "PRICE_THRESHOLD",
                "condition": "ABOVE",
                "value": 2850.50,
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "times_triggered": 3,
                "last_triggered": (datetime.now() - timedelta(days=1)).isoformat()
            },
            {
                "id": 2,
                "user_id": user_id,
                "symbol": "TCS",
                "alert_type": "PERCENT_CHANGE",
                "condition": "BELOW",
                "value": 5.0,
                "is_active": True,
                "created_at": (datetime.now() - timedelta(days=2)).isoformat(),
                "updated_at": (datetime.now() - timedelta(days=2)).isoformat(),
                "times_triggered": 1,
                "last_triggered": (datetime.now() - timedelta(days=3)).isoformat()
            },
            {
                "id": 3,
                "user_id": user_id,
                "symbol": "ADANIPORTS",
                "alert_type": "PRICE_THRESHOLD",
                "condition": "ABOVE",
                "value": 1500.0,
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "times_triggered": 0,
                "last_triggered": None
            }
        ]
        
        return jsonify({
            "alerts": mock_alerts,
            "count": len(mock_alerts),
            "source": "mock_data",
            "note": "Using mock data - database connection failed"
        })

    except Exception as e:
        print(f"Get user alerts error: {e}")
        return jsonify({"error": str(e)}), 500


# ---------------- GET ACTIVE ALERTS ----------------
@alerts_bp.route("/active/<int:user_id>", methods=["GET"])
def get_active_alerts(user_id):
    try:
        conn = get_db_connection()
        
        if conn:
            try:
                cur = conn.cursor()

                cur.execute("""
                    SELECT id, user_id, symbol, alert_type, condition, value, 
                           is_active, created_at, updated_at
                    FROM alerts
                    WHERE user_id = %s AND is_active = true
                    ORDER BY created_at DESC
                """, (user_id,))

                alerts = cur.fetchall()
                
                alerts_list = []
                for alert in alerts:
                    alerts_list.append({
                        "id": alert[0],
                        "user_id": alert[1],
                        "symbol": alert[2],
                        "alert_type": alert[3],
                        "condition": alert[4],
                        "value": float(alert[5]),
                        "is_active": alert[6],
                        "created_at": alert[7].isoformat() if alert[7] else None,
                        "updated_at": alert[8].isoformat() if alert[8] else None
                    })

                cur.close()
                conn.close()
                
                return jsonify({
                    "alerts": alerts_list,
                    "count": len(alerts_list),
                    "source": "database"
                })
                
            except Exception as db_error:
                print(f"Database error: {db_error}")
                # Fall through to mock data
        
        # Return mock data for development
        mock_alerts = [
            {
                "id": 1,
                "user_id": user_id,
                "symbol": "RELIANCE",
                "alert_type": "PRICE_THRESHOLD",
                "condition": "ABOVE",
                "value": 2850.50,
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            },
            {
                "id": 2,
                "user_id": user_id,
                "symbol": "TCS",
                "alert_type": "PERCENT_CHANGE",
                "condition": "BELOW",
                "value": 5.0,
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            },
            {
                "id": 3,
                "user_id": user_id,
                "symbol": "ADANIPORTS",
                "alert_type": "PRICE_THRESHOLD",
                "condition": "ABOVE",
                "value": 1500.0,
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        ]
        
        return jsonify({
            "alerts": mock_alerts,
            "count": len(mock_alerts),
            "source": "mock_data",
            "note": "Using mock data - database connection failed"
        })

    except Exception as e:
        print(f"Get active alerts error: {e}")
        return jsonify({"error": str(e)}), 500


# ---------------- UPDATE ALERT ----------------
@alerts_bp.route("/<int:alert_id>", methods=["PUT"])
def update_alert(alert_id):
    try:
        data = request.get_json()
        
        if 'user_id' not in data:
            return jsonify({"error": "user_id is required"}), 400
        
        user_id = data['user_id']
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                "message": "Alert updated successfully (mock)",
                "alert": {
                    "id": alert_id,
                    "user_id": user_id,
                    "symbol": "RELIANCE",
                    "alert_type": "PRICE_THRESHOLD",
                    "condition": "ABOVE",
                    "value": 2850.50,
                    "is_active": data.get('is_active', True),
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                },
                "note": "Using mock data - database not connected"
            })
        
        cur = conn.cursor()
        
        # Check if alert exists and belongs to user
        cur.execute("""
            SELECT id FROM alerts 
            WHERE id = %s AND user_id = %s
        """, (alert_id, user_id))
        
        alert = cur.fetchone()
        if not alert:
            cur.close()
            conn.close()
            return jsonify({"error": "Alert not found or access denied"}), 404
        
        # Build update query
        updates = []
        params = []
        
        if 'is_active' in data:
            updates.append("is_active = %s")
            params.append(data['is_active'])
        
        if 'value' in data:
            updates.append("value = %s")
            params.append(float(data['value']))
        
        if 'condition' in data:
            updates.append("condition = %s")
            params.append(data['condition'].upper())
        
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.extend([alert_id, user_id])
            
            update_query = f"""
                UPDATE alerts 
                SET {', '.join(updates)}
                WHERE id = %s AND user_id = %s
                RETURNING *
            """
            
            cur.execute(update_query, params)
            updated_alert = cur.fetchone()
            conn.commit()
            
            if updated_alert:
                alert_dict = {
                    "id": updated_alert[0],
                    "user_id": updated_alert[1],
                    "symbol": updated_alert[2],
                    "alert_type": updated_alert[3],
                    "condition": updated_alert[4],
                    "value": float(updated_alert[5]),
                    "is_active": updated_alert[6],
                    "created_at": updated_alert[7].isoformat() if updated_alert[7] else None,
                    "updated_at": updated_alert[8].isoformat() if updated_alert[8] else None
                }
                
                cur.close()
                conn.close()
                
                return jsonify({
                    "message": "Alert updated successfully",
                    "alert": alert_dict
                })
        
        cur.close()
        conn.close()
        return jsonify({"error": "No fields to update"}), 400
        
    except Exception as e:
        print(f"Update alert error: {e}")
        return jsonify({"error": str(e)}), 500


# ---------------- DELETE ALERT ----------------
@alerts_bp.route("/<int:alert_id>", methods=["DELETE"])
def delete_alert(alert_id):
    try:
        data = request.get_json()
        
        if 'user_id' not in data:
            return jsonify({"error": "user_id is required"}), 400
        
        user_id = data['user_id']
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"message": "Alert deleted successfully (mock)"}), 200
        
        cur = conn.cursor()
        
        # Delete alert (cascade will delete triggered alerts)
        cur.execute("""
            DELETE FROM alerts 
            WHERE id = %s AND user_id = %s
            RETURNING id
        """, (alert_id, user_id))
        
        deleted = cur.fetchone()
        conn.commit()
        
        cur.close()
        conn.close()
        
        if deleted:
            return jsonify({"message": "Alert deleted successfully"}), 200
        else:
            return jsonify({"error": "Alert not found or access denied"}), 404
        
    except Exception as e:
        print(f"Delete alert error: {e}")
        return jsonify({"error": str(e)}), 500


# ---------------- CHECK ALERTS FOR SYMBOL ----------------
@alerts_bp.route("/check/<symbol>", methods=["GET"])
def check_alerts_for_symbol(symbol):
    """Check if any alerts should trigger for a symbol"""
    try:
        from app.routes.analytics import fetch_marketstack_data, get_csv_data
        
        clean_sym = symbol.strip().upper()
        
        # Get current stock data
        api_response = fetch_marketstack_data(clean_sym, limit=2)
        
        if not api_response or "data" not in api_response or len(api_response["data"]) < 2:
            # Try CSV fallback
            csv_data = get_csv_data(clean_sym)
            if not csv_data or len(csv_data) < 2:
                return jsonify({
                    "symbol": clean_sym,
                    "current_price": 0,
                    "percent_change": 0,
                    "alerts_checked": 0,
                    "alerts_triggered": 0,
                    "message": "Could not fetch stock data"
                }), 200
            
            current_data = csv_data[-1]
            previous_data = csv_data[-2] if len(csv_data) > 1 else csv_data[-1]
            
            current_price = current_data['close']
            previous_price = previous_data['close']
            current_volume = current_data.get('volume', 0)
        else:
            current_data = api_response["data"][0]
            previous_data = api_response["data"][1]
            
            current_price = float(current_data.get("close") or 0)
            previous_price = float(previous_data.get("close") or 0)
            current_volume = int(current_data.get("volume") or 0)
        
        # Calculate changes
        price_change = current_price - previous_price
        percent_change = (price_change / previous_price * 100) if previous_price else 0
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                "symbol": clean_sym,
                "current_price": current_price,
                "percent_change": percent_change,
                "alerts_checked": 0,
                "alerts_triggered": 0,
                "triggered_alerts": [],
                "note": "Database not connected, skipping alert checks"
            })
        
        cur = conn.cursor()
        
        # Get active alerts for this symbol
        cur.execute("""
            SELECT a.* FROM alerts a
            WHERE a.symbol = %s AND a.is_active = true
        """, (clean_sym,))
        
        alerts = cur.fetchall()
        triggered_alerts = []
        
        for alert in alerts:
            should_trigger = False
            condition_met = ""
            
            if alert[3] == 'PRICE_THRESHOLD':  # alert_type at index 3
                if alert[4] == 'ABOVE' and current_price > alert[5]:
                    should_trigger = True
                    condition_met = f"Price {current_price} > {alert[5]}"
                elif alert[4] == 'BELOW' and current_price < alert[5]:
                    should_trigger = True
                    condition_met = f"Price {current_price} < {alert[5]}"
                elif alert[4] == 'EQUALS' and abs(current_price - alert[5]) < 0.01:
                    should_trigger = True
                    condition_met = f"Price {current_price} ≈ {alert[5]}"
                    
            elif alert[3] == 'PERCENT_CHANGE':
                if alert[4] == 'ABOVE' and percent_change > alert[5]:
                    should_trigger = True
                    condition_met = f"Change {percent_change:.2f}% > {alert[5]}%"
                elif alert[4] == 'BELOW' and percent_change < -alert[5]:
                    should_trigger = True
                    condition_met = f"Change {percent_change:.2f}% < -{alert[5]}%"
                    
            elif alert[3] == 'VOLUME_SPIKE':
                avg_volume = get_average_volume(clean_sym)
                if avg_volume and current_volume > avg_volume * 5:
                    should_trigger = True
                    condition_met = f"Volume spike: {current_volume} vs avg {int(avg_volume)}"
            
            if should_trigger:
                # Record triggered alert
                cur.execute("""
                    INSERT INTO triggered_alerts (alert_id, symbol, triggered_value, condition_met)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                """, (alert[0], clean_sym, current_price, condition_met))
                
                triggered_id = cur.fetchone()[0]
                
                # Create notification
                title = f"Alert Triggered: {clean_sym}"
                message = f"{alert[3].replace('_', ' ')} alert: {condition_met}"
                
                cur.execute("""
                    INSERT INTO notifications (user_id, title, message, type, metadata)
                    VALUES (%s, %s, %s, 'ALERT', %s)
                """, (alert[1], title, message, 
                     json.dumps({'alert_id': alert[0], 'symbol': clean_sym, 
                                'triggered_value': current_price, 'condition': condition_met})))
                
                triggered_alerts.append({
                    "alert_id": alert[0],
                    "triggered_id": triggered_id,
                    "condition_met": condition_met,
                    "current_price": current_price,
                    "user_id": alert[1]
                })
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            "symbol": clean_sym,
            "current_price": current_price,
            "percent_change": percent_change,
            "alerts_checked": len(alerts),
            "alerts_triggered": len(triggered_alerts),
            "triggered_alerts": triggered_alerts
        })
        
    except Exception as e:
        print(f"Check alerts error: {e}")
        return jsonify({"error": str(e)}), 500


# ---------------- GET TRIGGERED ALERTS ----------------
@alerts_bp.route("/triggered/<int:user_id>", methods=["GET"])
def get_triggered_alerts(user_id):
    try:
        conn = get_db_connection()
        
        if not conn:
            # Return mock data
            mock_triggered = [
                {
                    "id": 1,
                    "alert_id": 1,
                    "symbol": "RELIANCE",
                    "triggered_value": 2850.50,
                    "condition_met": "Price 2850.50 > 2850.00",
                    "triggered_at": (datetime.now() - timedelta(days=1)).isoformat(),
                    "alert_type": "PRICE_THRESHOLD",
                    "condition": "ABOVE",
                    "target_value": 2850.00
                }
            ]
            return jsonify({
                "triggered_alerts": mock_triggered,
                "count": len(mock_triggered),
                "source": "mock_data",
                "note": "Using mock data - database not connected"
            })
        
        cur = conn.cursor()

        cur.execute("""
            SELECT ta.*, a.symbol, a.alert_type, a.condition, a.value
            FROM triggered_alerts ta
            JOIN alerts a ON ta.alert_id = a.id
            WHERE a.user_id = %s
            ORDER BY ta.triggered_at DESC
            LIMIT 50
        """, (user_id,))

        triggered = cur.fetchall()
        
        triggered_list = []
        for trigger in triggered:
            triggered_list.append({
                "id": trigger[0],
                "alert_id": trigger[1],
                "symbol": trigger[2],
                "triggered_value": float(trigger[3]),
                "condition_met": trigger[4],
                "triggered_at": trigger[5].isoformat() if trigger[5] else None,
                "alert_type": trigger[7],
                "condition": trigger[8],
                "target_value": float(trigger[9])
            })

        cur.close()
        conn.close()

        return jsonify({
            "triggered_alerts": triggered_list,
            "count": len(triggered_list),
            "source": "database"
        })

    except Exception as e:
        print(f"Get triggered alerts error: {e}")
        return jsonify({"error": str(e)}), 500


# ---------------- TOGGLE ALERT ACTIVATION ----------------
@alerts_bp.route("/toggle/<int:alert_id>", methods=["PUT"])
def toggle_alert(alert_id):
    try:
        data = request.get_json()
        
        if 'user_id' not in data:
            return jsonify({"error": "user_id is required"}), 400
        
        user_id = data['user_id']
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                "message": "Alert toggled successfully (mock)",
                "alert": {
                    "id": alert_id,
                    "user_id": user_id,
                    "symbol": "RELIANCE",
                    "alert_type": "PRICE_THRESHOLD",
                    "condition": "ABOVE",
                    "value": 2850.50,
                    "is_active": False,  # Assume toggling to false
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                },
                "note": "Using mock data - database not connected"
            })
        
        cur = conn.cursor()
        
        # Check if alert exists and belongs to user
        cur.execute("""
            SELECT id, is_active FROM alerts 
            WHERE id = %s AND user_id = %s
        """, (alert_id, user_id))
        
        alert = cur.fetchone()
        if not alert:
            cur.close()
            conn.close()
            return jsonify({"error": "Alert not found or access denied"}), 404
        
        # Toggle the is_active status
        new_status = not alert[1]
        
        cur.execute("""
            UPDATE alerts 
            SET is_active = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
            RETURNING *
        """, (new_status, alert_id, user_id))
        
        updated_alert = cur.fetchone()
        conn.commit()
        
        if updated_alert:
            alert_dict = {
                "id": updated_alert[0],
                "user_id": updated_alert[1],
                "symbol": updated_alert[2],
                "alert_type": updated_alert[3],
                "condition": updated_alert[4],
                "value": float(updated_alert[5]),
                "is_active": updated_alert[6],
                "created_at": updated_alert[7].isoformat() if updated_alert[7] else None,
                "updated_at": updated_alert[8].isoformat() if updated_alert[8] else None
            }
            
            cur.close()
            conn.close()
            
            return jsonify({
                "message": f"Alert {'activated' if new_status else 'deactivated'} successfully",
                "alert": alert_dict
            })
        
        cur.close()
        conn.close()
        return jsonify({"error": "Failed to update alert"}), 500
        
    except Exception as e:
        print(f"Toggle alert error: {e}")
        return jsonify({"error": str(e)}), 500


# ---------------- GET ALERT STATISTICS ----------------
@alerts_bp.route("/stats/<int:user_id>", methods=["GET"])
def get_alert_stats(user_id):
    try:
        conn = get_db_connection()
        
        if not conn:
            # Return mock stats
            return jsonify({
                "user_id": user_id,
                "total_alerts": 5,
                "active_alerts": 3,
                "inactive_alerts": 2,
                "triggered_alerts": 7,
                "alerts_by_type": {
                    "PRICE_THRESHOLD": 3,
                    "PERCENT_CHANGE": 2,
                    "VOLUME_SPIKE": 0
                },
                "most_triggered": [
                    {"symbol": "RELIANCE", "count": 4},
                    {"symbol": "TCS", "count": 2},
                    {"symbol": "INFY", "count": 1}
                ],
                "source": "mock_data",
                "last_updated": datetime.now().isoformat(),
                "note": "Using mock data - database not connected"
            })
        
        cur = conn.cursor()

        # Get total alerts
        cur.execute("""
            SELECT 
                COUNT(*) as total_alerts,
                SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_alerts,
                SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END) as inactive_alerts
            FROM alerts 
            WHERE user_id = %s
        """, (user_id,))
        
        alert_counts = cur.fetchone()
        
        # Get triggered alerts count
        cur.execute("""
            SELECT COUNT(*) 
            FROM triggered_alerts ta
            JOIN alerts a ON ta.alert_id = a.id
            WHERE a.user_id = %s
        """, (user_id,))
        
        triggered_count = cur.fetchone()[0]
        
        # Get alerts by type
        cur.execute("""
            SELECT alert_type, COUNT(*) as count
            FROM alerts 
            WHERE user_id = %s
            GROUP BY alert_type
        """, (user_id,))
        
        alerts_by_type = {row[0]: row[1] for row in cur.fetchall()}
        
        # Get most triggered alerts
        cur.execute("""
            SELECT a.symbol, COUNT(ta.id) as trigger_count
            FROM triggered_alerts ta
            JOIN alerts a ON ta.alert_id = a.id
            WHERE a.user_id = %s
            GROUP BY a.symbol
            ORDER BY trigger_count DESC
            LIMIT 5
        """, (user_id,))
        
        most_triggered = [{"symbol": row[0], "count": row[1]} for row in cur.fetchall()]

        cur.close()
        conn.close()

        return jsonify({
            "user_id": user_id,
            "total_alerts": alert_counts[0],
            "active_alerts": alert_counts[1],
            "inactive_alerts": alert_counts[2],
            "triggered_alerts": triggered_count,
            "alerts_by_type": alerts_by_type,
            "most_triggered": most_triggered,
            "source": "database",
            "last_updated": datetime.now().isoformat()
        })

    except Exception as e:
        print(f"Get alert stats error: {e}")
        return jsonify({"error": str(e)}), 500

# ---------------- GET NOTIFICATIONS ----------------
@alerts_bp.route("/notifications/<int:user_id>", methods=["GET"])
def get_notifications(user_id):
    """Fetch unread alert notifications for a specific user"""
    try:
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        limit = int(request.args.get('limit', 10))
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        query = "SELECT * FROM notifications WHERE user_id = %s"
        if unread_only:
            query += " AND is_read = false"
        query += " ORDER BY created_at DESC LIMIT %s"
        
        cur.execute(query, (user_id, limit))
        notifications = cur.fetchall()
        
        # Get count for the badge
        cur.execute("SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = false", (user_id,))
        unread_count = cur.fetchone()['count']
        
        cur.close()
        conn.close()
        
        return jsonify({
            "notifications": notifications,
            "unread_count": unread_count
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- MARK NOTIFICATIONS AS READ ----------------
@alerts_bp.route("/notifications/mark-read", methods=["POST"])
def mark_notifications_read():
    """Mark specific or all notifications as read"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        notification_ids = data.get('notification_ids', [])
        mark_all = data.get('mark_all', False)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        if mark_all:
            cur.execute("UPDATE notifications SET is_read = true WHERE user_id = %s", (user_id,))
        else:
            cur.execute("UPDATE notifications SET is_read = true WHERE id = ANY(%s)", (notification_ids,))
            
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"message": "Notifications updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500