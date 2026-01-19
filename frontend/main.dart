import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:async';
import 'package:overlay_support/overlay_support.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Import your screens
import 'login_register_screen.dart';
import 'home_screen.dart';
import 'ai_bot.dart';
import 'portfolio.dart';
import 'watchlist_screen.dart';
import 'dashboard.dart';
import 'firebase_options.dart';

// --- ENHANCED DESIGN SYSTEM ---
const Color kPrimaryColor = Color(0xFF0B132B); // Deep Space Blue
const Color kAccentColor = Color(0xFF6FFFB0);  // Neon Mint
const Color kTextColor = Colors.white;
const Color kCardColor = Color(0xFF1C2541);    // Midnight Navy

// Global Theme Manager for Dark/Light Mode
class ThemeManager with ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.dark;
  ThemeMode get themeMode => _themeMode;

  void toggleTheme(bool isDark) {
    _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }
}
final themeManager = ThemeManager();

// Global Key for interactions
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  final prefs = await SharedPreferences.getInstance();
  List<String> logs = prefs.getStringList('notification_logs') ?? [];

  Map<String, dynamic> newLog = {
    'title': message.data['title'] ?? message.notification?.title ?? "Market Update",
    'body': message.data['body'] ?? message.notification?.body ?? "",
    'time': DateTime.now().toString().split('.')[0],
  };

  logs.insert(0, jsonEncode(newLog));
  await prefs.setStringList('notification_logs', logs);
}

// --- NOTIFICATION SERVICE ---
class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  static Future<void> initialize(String userEmail) async {
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    await _messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      try {
        String? token = await _messaging.getToken(
          vapidKey: "BPCLqu8ianUDsKD7VnAHsilBHF-MN0bBdhtof4qhVPXNajM34P3GjlBqf92fxq65ZUxd30ZxUieyzfj0RzBlhLA",
        );

        if (token != null) {
          await _sendTokenToBackend(userEmail, token);
        }
      } catch (e) {
        debugPrint("Token Error: $e");
      }
    }
  }

  static Future<void> _sendTokenToBackend(String email, String token) async {
    final url = Uri.parse('http://localhost:8000/user/update-fcm-token');
    try {
      await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'token': token}),
      );
    } catch (e) {
      debugPrint("Backend sync error: $e");
    }
  }

  static Future<void> saveNotification(RemoteMessage message) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> logs = prefs.getStringList('notification_logs') ?? [];

    Map<String, dynamic> newLog = {
      'title': message.data['title'] ?? message.notification?.title ?? "Market Update",
      'body': message.data['body'] ?? message.notification?.body ?? "",
      'time': DateTime.now().toString().split('.')[0],
    };

    logs.insert(0, jsonEncode(newLog));
    if (logs.length > 50) logs = logs.sublist(0, 50);
    await prefs.setStringList('notification_logs', logs);
  }
}

// --- MAIN ENTRY POINT ---
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
    alert: false,
    badge: true,
    sound: true,
  );

  FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
    await NotificationService.saveNotification(message);

    showSimpleNotification(
      Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: kCardColor.withOpacity(0.95),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white10),
          boxShadow: const [
            BoxShadow(color: Colors.black45, blurRadius: 15, offset: Offset(0, 8)),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: kAccentColor.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.auto_graph_rounded, color: kAccentColor, size: 28),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      message.data['title'] ?? message.notification?.title ?? "Market Update",
                      style: GoogleFonts.plusJakartaSans(
                        fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white,
                      ),
                    ),
                    Text(
                      message.data['body'] ?? message.notification?.body ?? "",
                      style: GoogleFonts.plusJakartaSans(fontSize: 14, color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      background: Colors.transparent,
      elevation: 0,
      duration: const Duration(seconds: 4),
      slideDismissDirection: DismissDirection.horizontal,
    );
  });

  runApp(
    const OverlaySupport.global(
      child: MyApp(),
    ),
  );
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  void initState() {
    super.initState();
    // Use a named function so we can remove it later
    themeManager.addListener(_themeListener);
  }

  void _themeListener() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    themeManager.removeListener(_themeListener);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // REMOVED OverlaySupport.global from here
    return MaterialApp(
      title: 'AI Stock Screener',
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      themeMode: themeManager.themeMode,

      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: kPrimaryColor,
        textTheme: GoogleFonts.plusJakartaSansTextTheme().apply(
          bodyColor: kTextColor,
          displayColor: kTextColor,
        ),
      ),

      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        textTheme: GoogleFonts.plusJakartaSansTextTheme().apply(
          bodyColor: const Color(0xFF1E293B),
          displayColor: const Color(0xFF1E293B),
        ),
      ),

      home: const SplashScreen(),
      routes: {
        '/login': (context) => const LoginRegisterScreen(),
        '/home': (context) => const MarketTerminal(),
        '/ai_bot': (context) => const AiBotScreen(),
        '/dashboard': (context) => const MarketTerminal(),
        '/watchlist': (context) => const WatchlistScreen(),
        '/portfolio': (context) => const GrowwPortfolioPage(userId: 'user_01'),
      },
    );
  }
}
// --- ENHANCED PROFESSIONAL SPLASH SCREEN ---
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );

    _controller.forward();

    Timer(const Duration(seconds: 4), () {
      if (mounted) Navigator.of(context).pushReplacementNamed('/login');
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [kPrimaryColor, Color(0xFF1C2541)],
          ),
        ),
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: ScaleTransition(
            scale: _scaleAnimation,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // PROFESSIONAL LOGO CONCEPT: Glassmorphic Shield with Icon
                Container(
                  padding: const EdgeInsets.all(30),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: kAccentColor.withOpacity(0.05),
                    border: Border.all(color: kAccentColor.withOpacity(0.2), width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: kAccentColor.withOpacity(0.1),
                        blurRadius: 40,
                        spreadRadius: 10,
                      )
                    ],
                  ),
                  child: const Icon(
                    Icons.insights_rounded, // Better professional stock icon
                    size: 100,
                    color: kAccentColor,
                  ),
                ),
                const SizedBox(height: 40),
                Text(
                  'AI Stock Screener ',
                  style: GoogleFonts.plusJakartaSans(
                    color: kTextColor,
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'INTELLIGENT MARKET INSIGHTS',
                  style: GoogleFonts.plusJakartaSans(
                    color: kAccentColor.withOpacity(0.8),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 4,
                  ),
                ),
                const SizedBox(height: 80),
                const SizedBox(
                  width: 40,
                  height: 40,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(kAccentColor),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}