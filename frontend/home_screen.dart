import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lottie/lottie.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

// Import your existing screens
import 'dashboard.dart';
import 'watchlist_screen.dart';
import 'portfolio.dart';
import 'live_data.dart';
import 'ai_bot.dart';
import 'notification_center_screen.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

const AndroidNotificationChannel channel = AndroidNotificationChannel(
  'high_importance_channel',
  'High Importance Notifications',
  description: 'This channel is used for important notifications.',
  importance: Importance.max,
);

class MarketTerminal extends StatefulWidget {
  const MarketTerminal({super.key});
  @override
  State<MarketTerminal> createState() => MarketTerminalState();
}

class MarketTerminalState extends State<MarketTerminal> {
  bool _isBotExpanded = true;
  int _selectedIndex = 0;
  final String baseUrl = "http://localhost:8000"; // Your DB URL

  // --- BRANDED DESIGN SYSTEM ---
  final Color kSpaceBg = const Color(0xFF0B132B);
  final Color kMint = const Color(0xFF6FFFB0);
  final Color kCardNavy = const Color(0xFF1C2541);
  final Color kGlassBorder = Colors.white.withOpacity(0.08);

  @override
  void initState() {
    super.initState();
    _setupNotifications();
  }

  Future<void> _setupNotifications() async {
    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    const AndroidInitializationSettings initializationSettingsAndroid =
    AndroidInitializationSettings('@mipmap/ic_launcher');

    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
    );

    await flutterLocalNotificationsPlugin.initialize(initializationSettings);

    // FIX: To prevent 2 notifications, we handle the foreground message refresh
    // but DO NOT call flutterLocalNotificationsPlugin.show() if Firebase is already showing it.
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint("New Message Received: ${message.notification?.title}");
      // Only Refresh UI on the Home Screen when a new alert hits
      if (mounted) setState(() {});
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      if (mounted) {
        Navigator.push(context, MaterialPageRoute(builder: (context) => const NotificationCenterScreen(notifications: [],)));
      }
    });
  }

  // Fetch only the single latest dynamic notification from your database
  Future<Map<String, dynamic>?> _fetchLatestAlert() async {
    try {
      final r = await http.get(Uri.parse("$baseUrl/notifications/latest?limit=1"));
      if (r.statusCode == 200) {
        List data = jsonDecode(r.body);
        if (data.isNotEmpty) return data[0];
      }
    } catch (e) {
      debugPrint("DB Fetch Error: $e");
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSpaceBg,
      body: Stack(
        children: [
          IndexedStack(
            index: _selectedIndex,
            children: [
              _buildDynamicHomeScreen(),
              const DashboardScreen(),
              const WatchlistScreen(),
              const GrowwPortfolioPage(userId: 'user_01'),
              const LiveDataPage(),
            ],
          ),
          _buildFloatingBot(),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildDynamicHomeScreen() {
    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        SliverAppBar(
          expandedHeight: 120,
          backgroundColor: Colors.transparent,
          elevation: 0,
          floating: true,
          flexibleSpace: FlexibleSpaceBar(background: _buildWelcomeHeader()),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSectionLabel("ACTIVE SIGNAL"),
                const SizedBox(height: 12),

                // DYNAMIC ALERT UI (Exactly like your screenshot)
                FutureBuilder<Map<String, dynamic>?>(
                  future: _fetchLatestAlert(),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) return const SizedBox();
                    if (!snapshot.hasData) return _buildEmptySignal();

                    return _buildInAppNotificationCard(
                      snapshot.data!['title'] ?? "Market Signal",
                      snapshot.data!['body'] ?? "Analyzing market conditions...",
                    );
                  },
                ),
                const SizedBox(height: 100),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSectionLabel(String text) {
    return Text(text,
        style: GoogleFonts.plusJakartaSans(
            color: kMint.withOpacity(0.5), fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 2));
  }

  Widget _buildInAppNotificationCard(String title, String body) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: kCardNavy.withOpacity(0.8),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: kGlassBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: kMint.withOpacity(0.1), borderRadius: BorderRadius.circular(16)),
            child: Icon(Icons.auto_graph_rounded, color: kMint, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
                const SizedBox(height: 4),
                Text(body, style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontSize: 12, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptySignal() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(30),
      decoration: BoxDecoration(
        color: kCardNavy.withOpacity(0.2),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: kGlassBorder),
      ),
      child: Center(
        child: Text("Waiting for next signal...",
            style: GoogleFonts.plusJakartaSans(color: Colors.white10, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildWelcomeHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 60, 24, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Good Morning, Trader",
                  style: GoogleFonts.plusJakartaSans(color: kMint, fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 1.5)),
              const SizedBox(height: 4),
              Text("Terminal Overview",
                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
            ],
          ),
          _buildNotificationIcon(),
        ],
      ),
    );
  }

  Widget _buildNotificationIcon() {
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const NotificationCenterScreen(notifications: [],))),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: kCardNavy, borderRadius: BorderRadius.circular(16), border: Border.all(color: kGlassBorder)),
        child: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 24),
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      color: kSpaceBg,
      child: Container(
        height: 70,
        decoration: BoxDecoration(color: kCardNavy.withOpacity(0.8), borderRadius: BorderRadius.circular(24), border: Border.all(color: kGlassBorder)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _navItem(Icons.grid_view_rounded, 'Home', 0),
            _navItem(Icons.analytics_rounded, 'Market', 1),
            _navItem(Icons.auto_graph_rounded, 'Watchlist', 2),
            _navItem(Icons.account_balance_wallet_rounded, 'Portfolio', 3),
            _navItem(Icons.bolt_rounded, 'Live', 4),
          ],
        ),
      ),
    );
  }

  Widget _navItem(IconData icon, String label, int index) {
    bool isSelected = _selectedIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedIndex = index),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: isSelected ? kMint : Colors.white24, size: 24),
          const SizedBox(height: 4),
          Text(label, style: GoogleFonts.plusJakartaSans(color: isSelected ? kMint : Colors.white24, fontSize: 10, fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildFloatingBot() {
    return AnimatedPositioned(
      duration: const Duration(milliseconds: 600),
      curve: Curves.elasticOut,
      bottom: 120,
      right: _isBotExpanded ? 20 : -30,
      child: GestureDetector(
        onTap: () => setState(() => _isBotExpanded = !_isBotExpanded),
        onDoubleTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const AiBotScreen())),
        child: SizedBox(width: 120, height: 120, child: Lottie.asset('assets/lottie/ai_bot.json')),
      ),
    );
  }
}