import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'build_notification_card.dart';
import 'package:overlay_support/overlay_support.dart';

class NotificationCenterScreen extends StatefulWidget {
  // Keeping the constructor as you requested
  const NotificationCenterScreen({super.key, required List<RemoteMessage> notifications});

  @override
  State<NotificationCenterScreen> createState() => _NotificationCenterScreenState();
}

class _NotificationCenterScreenState extends State<NotificationCenterScreen> {
  late Future<List<dynamic>> _notificationsFuture;

  // Branded Palette
  final Color kSpaceBg = const Color(0xFF0B132B);
  final Color kMint = const Color(0xFF6FFFB0);
  final Color kCardNavy = const Color(0xFF1C2541);

  @override
  void initState() {
    super.initState();

    // 1. Initial Data Fetch
    _notificationsFuture = _fetchNotifications();

    // 2. Authorize OS for foreground banners
    FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    // 3. Live Listener for Top Banners and List Refresh
    FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      // 1. Extract data
      String title = message.notification?.title ?? message.data['title'] ?? "Stock Alert";
      String body = message.notification?.body ?? message.data['body'] ?? "";
      String time = DateTime.now().toString().split('.')[0]; // Format: 2024-10-20 14:30:00

      // 2. SAVE to Local Storage so it appears in the list later
      await _saveNotificationLocally(title, body, time);

      // 3. Trigger the TOP BANNER
      showSimpleNotification(
        Text(title, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold)),
        subtitle: Text(body, style: GoogleFonts.plusJakartaSans(color: Colors.white70)),
        background: kCardNavy,
        duration: const Duration(seconds: 5),
      );

      // 4. Refresh the list UI
      if (mounted) {
        setState(() {
          _notificationsFuture = _fetchNotifications();
        });
      }
    });
  }
  Future<void> _saveNotificationLocally(String title, String body, String time) async {
    final prefs = await SharedPreferences.getInstance();

    // Get existing logs
    List<String> localLogs = prefs.getStringList('notification_logs') ?? [];

    // Create new notification object
    Map<String, String> newNotification = {
      'title': title,
      'body': body,
      'time': time,
    };

    // Insert at the top of the list (index 0)
    localLogs.insert(0, jsonEncode(newNotification));

    // Optional: Limit to last 50 notifications to save memory
    if (localLogs.length > 50) {
      localLogs = localLogs.sublist(0, 50);
    }

    // Save back to SharedPreferences
    await prefs.setStringList('notification_logs', localLogs);
  }

  /// Robust Fetch Logic: Tries API first, falls back to SharedPreferences
  Future<List<dynamic>> _fetchNotifications() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final email = prefs.getString('user_email') ?? "user_01";

      debugPrint("🚨 Fetching notifications for: $email");

      // 1. Try fetching from Backend
      final response = await http.get(Uri.parse('http://localhost:8000/history/$email'));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        // 2. Fallback to Local Logs if API fails
        return _loadLocalLogs(prefs);
      }
    } catch (e) {
      debugPrint("❌ Fetch Error: $e");
      // 3. Fallback to Local Logs on Network failure
      final prefs = await SharedPreferences.getInstance();
      return _loadLocalLogs(prefs);
    }
  }

  List<dynamic> _loadLocalLogs(SharedPreferences prefs) {
    final List<String> localLogs = prefs.getStringList('notification_logs') ?? [];
    return localLogs.map((item) => jsonDecode(item)).toList();
  }

  void _showPopup(String? title, String? body) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: kCardNavy,
        title: Text(title ?? "Alert", style: const TextStyle(color: Colors.white)),
        content: Text(body ?? "", style: const TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text("Close", style: TextStyle(color: kMint))
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSpaceBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
            'Notifications',
            style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, color: Colors.white)
        ),
      ),
      body: FutureBuilder<List<dynamic>>(
        future: _notificationsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(child: CircularProgressIndicator(color: kMint));
          }

          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none, color: Colors.white24, size: 60),
                  const SizedBox(height: 16),
                  Text(
                    "No notifications yet",
                    style: GoogleFonts.plusJakartaSans(color: Colors.white24, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: snapshot.data!.length,
            itemBuilder: (context, index) {
              final item = snapshot.data![index];
              return buildNotificationCard(
                title: item['title'] ?? "Market Alert",
                message: item['body'] ?? "",
                time: item['time'] ?? "",
                isRead: true,
              );
            },
          );
        },
      ),
    );
  }
}