import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';


// Ensure this matches your project structure to access kPrimaryColor, etc.
import 'main.dart';

// --- 1. THE SERVICE CLASS (Full Logic + Debug Prints + Persistence) ---
class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  static Future<void> initialize(String userEmail) async {
    debugPrint("🚨 [DEBUG] 1: initialize() called for $userEmail");

    if (!kIsWeb) {
      debugPrint("🚨 [DEBUG] Running on Mobile/Desktop");
    }

    try {
      debugPrint("🚨 [DEBUG] 3: Requesting Firebase permissions...");
      NotificationSettings settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      debugPrint("🚨 [DEBUG] 4: Permission status: ${settings.authorizationStatus}");

      // VAPID KEY is essential for Web Push
      String? token = await _messaging.getToken(
        vapidKey: "BPCLqu8ianUDsKD7VnAHsilBHF-MN0bBdhtof4qhVPXNajM34P3GjlBqf92fxq65ZUxd30ZxUieyzfj0RzBlhLA",
      );

      if (token != null) {
        debugPrint("🚨 [DEBUG] 5: Token received: $token");
        await _sendTokenToBackend(userEmail, token);
      } else {
        debugPrint("🚨 [DEBUG] 5: Token came back NULL from Firebase");
      }
    } catch (e) {
      debugPrint("🚨 [DEBUG] ERROR during initialization: $e");
    }
  }

  static Future<void> _sendTokenToBackend(String email, String token) async {
    const String apiUrl = 'http://localhost:8000/user/update-fcm-token';
    debugPrint("🚨 [DEBUG] Attempting to sync token to: $apiUrl");

    try {
      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'token': token}),
      );

      if (response.statusCode == 200) {
        debugPrint("✅ SUCCESS: Token saved to Database");
      } else {
        debugPrint("❌ FAILED: Backend returned ${response.statusCode} - ${response.body}");
      }
    } catch (e) {
      debugPrint("❌ NETWORK ERROR: Is backend running? Error: $e");
    }
  }

  // PERSISTENCE LOGIC: Saves incoming notification so it stays in the list
  static Future<void> saveNotification(RemoteMessage message) async {
    debugPrint("🚨 [DEBUG] Saving incoming notification to local storage...");
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    List<String> logs = prefs.getStringList('notification_logs') ?? [];

    Map<String, String> newLog = {
      'title': message.notification?.title ?? "Market Alert",
      'body': message.notification?.body ?? "New data available in terminal",
      'time': DateTime.now().toIso8601String(),
    };

    logs.insert(0, jsonEncode(newLog)); // Add most recent to top
    await prefs.setStringList('notification_logs', logs);
    debugPrint("✅ [DEBUG] Notification logged successfully.");
  }
}

// --- 2. THE UI SCREEN (Enhanced Dynamic Terminal) ---
class NotificationCenterScreen extends StatefulWidget {
  const NotificationCenterScreen({super.key});

  @override
  State<NotificationCenterScreen> createState() => _NotificationCenterScreenState();
}

class _NotificationCenterScreenState extends State<NotificationCenterScreen> {
  List<Map<String, dynamic>> _notifications = [];
  bool _isLoading = true;

  // Branded Palette
  final Color kSpaceBg = const Color(0xFF0B132B);
  final Color kMint = const Color(0xFF6FFFB0);
  final Color kCardNavy = const Color(0xFF1C2541);

  @override
  void initState() {
    super.initState();
    _loadStoredNotifications();

    // LISTEN LIVE: Update UI immediately if a message arrives while screen is open
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint("🚨 [DEBUG] Live notification received in Notification Center");
      NotificationService.saveNotification(message).then((_) {
        _loadStoredNotifications();
      });
    });
  }

  Future<void> _loadStoredNotifications() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    List<String> logs = prefs.getStringList('notification_logs') ?? [];

    if (mounted) {
      setState(() {
        _notifications = logs.map((item) => jsonDecode(item) as Map<String, dynamic>).toList();
        _isLoading = false;
      });
    }
  }

  Future<void> _clearLogs() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove('notification_logs');
    debugPrint("🚨 [DEBUG] Notification logs cleared by user");
    _loadStoredNotifications();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSpaceBg,
      extendBodyBehindAppBar: true,
      appBar: _buildAppBar(),
      body: Container(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: const Alignment(1, -0.8),
            radius: 1.2,
            colors: [kMint.withOpacity(0.07), Colors.transparent],
          ),
        ),
        child: _isLoading
            ? Center(child: CircularProgressIndicator(color: kMint))
            : _notifications.isEmpty
            ? _buildEmptyState()
            : _buildTerminalList(),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("COMMAND LOG",
              style: GoogleFonts.plusJakartaSans(
                  color: kMint, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 2)),
          Text("Alert History",
              style: GoogleFonts.plusJakartaSans(
                  color: Colors.white, fontWeight: FontWeight.w800, fontSize: 24)),
        ],
      ),
      actions: [
        IconButton(
          onPressed: _clearLogs,
          icon: Icon(Icons.delete_sweep_outlined, color: Colors.redAccent.withOpacity(0.7)),
        ),
        const SizedBox(width: 10),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_off_outlined, color: kMint.withOpacity(0.1), size: 100),
          const SizedBox(height: 16),
          Text("SYSTEM SECURE: NO ALERTS",
              style: GoogleFonts.plusJakartaSans(
                  color: Colors.white24, fontWeight: FontWeight.bold, letterSpacing: 2)),
        ],
      ),
    );
  }

  Widget _buildTerminalList() {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 120, 16, 40),
      itemCount: _notifications.length,
      itemBuilder: (context, index) {
        final item = _notifications[index];
        return _buildTerminalLogCard(item);
      },
    );
  }

  Widget _buildTerminalLogCard(Map<String, dynamic> data) {
    DateTime time = DateTime.tryParse(data['time']) ?? DateTime.now();
    String formattedTime = "${time.hour}:${time.minute.toString().padLeft(2, '0')}";

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: kCardNavy.withOpacity(0.7),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: kMint.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.radar_rounded, color: kMint, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(data['title'],
                        style: GoogleFonts.plusJakartaSans(
                            color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                    Text(formattedTime,
                        style: GoogleFonts.plusJakartaSans(
                            color: Colors.white38, fontSize: 10, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                Text(data['body'],
                    style: GoogleFonts.plusJakartaSans(
                        color: Colors.white70, fontSize: 13, height: 1.5)),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: kMint.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: kMint.withOpacity(0.2)),
                  ),
                  child: Text("NSE ANALYTICS",
                      style: GoogleFonts.plusJakartaSans(
                          color: kMint, fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 1)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}