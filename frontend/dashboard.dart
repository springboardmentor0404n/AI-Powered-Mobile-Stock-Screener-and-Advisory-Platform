import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lottie/lottie.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vibration/vibration.dart';

// Assuming these imports exist in your project
import 'main.dart';
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

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => DashboardScreenState();
}

class DashboardScreenState extends State<DashboardScreen> {
  final String baseUrl = "http://localhost:8000";
  bool isLoading = true;
  String selectedTicker = "INFY";
  bool _isBotExpanded = true;
  int _selectedIndex = 0;
  double _botPosX = 20.0; // Default right margin
  double _botPosY = 120.0; // Default bottom margin
  bool _hasUnreadNotification = false;

  final Map<String, String> metricLabels = {
    'h': 'HIGH',
    'l': 'LOW',
    'c': 'CLOSE'
  };
  String activeMetric = "c";

  Map<String, dynamic> kpis = {};
  List<dynamic> nifty15 = [];
  List<dynamic> barData = [];
  List<dynamic> tableData = [];
  List<dynamic> volumeData = [];
  List<FlSpot> chartSpots = [];
  List<dynamic> rawHistory = [];
  List<RemoteMessage> _notifications = []; // Stores the actual notification data


  // Terminal Theme Colors
  final Color kPrimary = const Color(0xFF0B132B);
  final Color kAccent = const Color(0xFF6FFFB0);
  final Color kCardColor = const Color(0xFF1C2541);
  final Color kGlassBorder = Colors.white.withOpacity(0.1);
  final Color kSpaceBg = const Color(0xFF0B132B);
  final Color kMint = const Color(0xFF6FFFB0);
  final Color kCardNavy = const Color(0xFF1C2541);

  final List<Color> sectorColors = [
    const Color(0xFF6FFFB0),
    const Color(0xFF4D96FF),
    const Color(0xFFFF6B6B),
    const Color(0xFFFFD93D),
    const Color(0xFF9B59B6),
    const Color(0xFFE67E22),
  ];

  @override
  void initState() {
    super.initState();
    _setupNotifications();
    _fetchInitialData();
    FirebaseMessaging.onMessage.listen((msg) => _fetchInitialData());
    themeManager.addListener(_handleThemeUpdate);
  }

  @override
  void dispose() {
    themeManager.removeListener(_handleThemeUpdate);
    super.dispose();
  }

  void _handleThemeUpdate() {
    if (mounted) setState(() {});
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

    // FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    //   debugPrint("New Message Received: ${message.notification?.title}");
    //   if (mounted) setState(() {});
    // });

    FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      debugPrint("New Message Received: ${message.notification?.title}");
      NotificationService.saveNotification(message);
      if (await Vibration.hasVibrator() ?? false) {
      // pattern: [wait 0ms, vibrate 200ms, wait 100ms, vibrate 200ms]
      Vibration.vibrate(pattern: [0, 200, 100, 200]);
      }
      if (mounted) {
        setState(() {
          // _notifications.insert(0, message); // Add new notification to the top of the list
          _hasUnreadNotification = true;
        });
      }
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      if (mounted) {
        Navigator.push(context, MaterialPageRoute(builder: (context) => const NotificationCenterScreen(notifications: [],)));
      }
    });
  }

  Future<void> _fetchInitialData() async {
    setState(() => isLoading = true);
    try {
      final res = await Future.wait([
        http.get(Uri.parse("$baseUrl/dashboard/kpis")),
        http.get(Uri.parse("$baseUrl/stocks/nifty15")),
        http.get(Uri.parse("$baseUrl/stocks/market-cap-leaders")),
        http.get(Uri.parse("$baseUrl/stocks/top-table")),
        http.get(Uri.parse("$baseUrl/dashboard/volume-share")),
      ]);

      if (mounted) {
        setState(() {
          kpis = jsonDecode(res[0].body);
          nifty15 = jsonDecode(res[1].body);
          barData = jsonDecode(res[2].body);
          tableData = jsonDecode(res[3].body);
          volumeData = jsonDecode(res[4].body);
          if (nifty15.isNotEmpty && selectedTicker == "INFY") {
            selectedTicker = nifty15[0]['symbol'];
          }
        });
        await _fetchHistory(selectedTicker);
      }
    } catch (e) {
      debugPrint("Fetch Error: $e");
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  Future<void> _fetchHistory(String symbol) async {
    final res = await http.get(Uri.parse("$baseUrl/stocks/history/$symbol"));
    if (res.statusCode == 200 && mounted) {
      setState(() {
        rawHistory = jsonDecode(res.body);
        _updateGraphLine();
      });
    }
  }

  void _updateGraphLine() {
    setState(() {
      chartSpots = rawHistory.asMap().entries.map((e) {
        double val = double.tryParse(e.value[activeMetric].toString()) ?? 0.0;
        return FlSpot(e.key.toDouble(), val);
      }).toList();
    });
  }

  // CORE FIX: This build method now handles the navigation logic and Stack
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSpaceBg,
      body: Stack(
        children: [
          IndexedStack(
            index: _selectedIndex,
            children: [
              _buildMainDashboardContent(), // This holds your terminal UI
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

  // Extracted your original dashboard UI into this helper
  Widget _buildMainDashboardContent() {
    return Scaffold(
      backgroundColor: kPrimary,
      extendBodyBehindAppBar: true,
      appBar: _buildAppBar(),
      body: isLoading
          ? Center(child: CircularProgressIndicator(color: kAccent))
          : Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [kPrimary, kCardColor.withOpacity(0.8)]),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 120, 16, 120), // Added bottom padding for nav
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildModernKpiRow(),
              const SizedBox(height: 32),
              _buildSectionHeader("Price Trajectory", "TIME-SERIES DATA"),
              _buildGlassCard(_buildGraphContent()),
              const SizedBox(height: 32),
              _buildSectionHeader("Sector Allocation", "PORTFOLIO SPREAD"),
              _buildGlassCard(_buildVolumeContent()),
              const SizedBox(height: 32),
              _buildSectionHeader("Valuation Hierarchy", "MARKET CAP (TRILLION)"),
              _buildGlassCard(_buildBarContent()),
              const SizedBox(height: 32),
              _buildSectionHeader("Movers & Shakers", "ACTIVE VOLATILITY"),
              _buildTerminalTable(),
            ],
          ),
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      // --- LOGOUT BUTTON START ---
      leading: IconButton(
        icon: Icon(Icons.logout_rounded, color: Colors.redAccent.withOpacity(0.8), size: 22),
        tooltip: 'Logout',
        onPressed: () {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              backgroundColor: kCardNavy,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: kGlassBorder,width: 1)),
              title: Text("Terminal Shutdown", style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold)),
              content: Text("Are you sure you want to terminate the current session?", style: GoogleFonts.plusJakartaSans(color: Colors.white70)),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text("CANCEL", style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontWeight: FontWeight.bold)),
                ),
                TextButton(
                  onPressed: () async {
                    final prefs = await SharedPreferences.getInstance();
                    await prefs.clear(); // Clears email and login status
                    if (mounted) {
                      // Navigate to your Login/Register screen and clear the stack
                      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
                    }
                  },
                  child: Text("LOGOUT", style: GoogleFonts.plusJakartaSans(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          );
        },
      ),
      // --- LOGOUT BUTTON END ---
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Market Insights",
              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)),
          Text("QUANTITATIVE ANALYTICS ENGINE",
              style: GoogleFonts.plusJakartaSans(color: kAccent, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
        ],
      ),
      actions: [
        IconButton(
            icon: Icon(Icons.refresh_rounded, color: kAccent),
            onPressed: _fetchInitialData),
        const SizedBox(width: 8),
        _buildNotificationIcon(),
        const SizedBox(width: 16),
      ],
    );
  }

  Widget _buildNotificationIcon() {
    return GestureDetector(
      onTap: () {
        setState(() {
          _hasUnreadNotification = false; // Reset the red dot
        });

        // Navigate to the screen - it will load logs from SharedPreferences automatically
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const NotificationCenterScreen(notifications: [],)),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: kCardNavy,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: kGlassBorder),
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            const Icon(
              Icons.notifications_none_rounded,
              color: Colors.white,
              size: 20,
            ),
            if (_hasUnreadNotification)
              Positioned(
                right: -1,
                top: -1,
                child: Container(
                  height: 10,
                  width: 10,
                  decoration: BoxDecoration(
                    color: Colors.redAccent,
                    shape: BoxShape.circle,
                    border: Border.all(color: kCardNavy, width: 1.5),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      color: kSpaceBg,
      child: Container(
        height: 70,
        decoration: BoxDecoration(color: kCardNavy.withOpacity(0.95), borderRadius: BorderRadius.circular(24), border: Border.all(color: kGlassBorder)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _navItem(Icons.analytics_rounded, 'Market', 0),
            _navItem(Icons.auto_graph_rounded, 'Watchlist', 1),
            _navItem(Icons.account_balance_wallet_rounded, 'Portfolio', 2),
            _navItem(Icons.bolt_rounded, 'Live', 3),
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
    return Positioned(
      right: _botPosX,
      bottom: _botPosY,
      child: GestureDetector(
        onPanUpdate: (details) {
          setState(() {
            _botPosX -= details.delta.dx;
            _botPosY -= details.delta.dy;
          });
        },
        onTap: () => setState(() => _isBotExpanded = !_isBotExpanded),
        onDoubleTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const AiBotScreen())
        ),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOutBack, // Adds a nice "pop" effect when expanding
          width: _isBotExpanded ? 100 : 85,
          height: _isBotExpanded ? 100 : 85,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            // Glass-morphism effect
            color: kMint.withOpacity(0.05),
            border: Border.all(color: kMint.withOpacity(0.2), width: 1.5),
            boxShadow: [
              // Outer Neon Glow
              BoxShadow(
                color: kMint.withOpacity(0.15),
                blurRadius: 20,
                spreadRadius: 5,
              ),
              // Inner core glow
              BoxShadow(
                color: kMint.withOpacity(0.1),
                blurRadius: 10,
                spreadRadius: -2,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Subtle background pulse or blur
                Container(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        kMint.withOpacity(0.1),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
                // The Lottie Asset
                Lottie.asset(
                  'assets/lottie/ai_bot.json',
                  fit: BoxFit.contain,
                  // Make sure the animation fills the container nicely
                  alignment: Alignment.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- UI Components ---

  Widget _buildSectionHeader(String title, String tag) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16, left: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(tag, style: GoogleFonts.plusJakartaSans(color: kAccent, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5)),
          Text(title, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  Widget _buildGlassCard(Widget child) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: kGlassBorder),
      ),
      child: child,
    );
  }

  Widget _buildModernKpiRow() {
    return Row(
      children: [
        _kpiItem("AVG P/E", kpis['avg_pe']?.toString() ?? "0.0", Icons.blur_on_rounded, kAccent),
        const SizedBox(width: 12),
        _kpiItem("MARKET CAP", kpis['total_mcap']?.toString() ?? "\$0T", Icons.account_balance_rounded, Colors.indigoAccent),
      ],
    );
  }

  Widget _kpiItem(String title, String val, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: kCardColor.withOpacity(0.5),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 16),
            Text(val, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
            Text(title, style: GoogleFonts.plusJakartaSans(color: Colors.white54, fontSize: 9, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildGraphContent() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Wrap pills in Flexible to prevent pushing the dropdown out
            Flexible(child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: _buildMetricPills())),
            const SizedBox(width: 8),
            _buildTerminalDropdown()
          ],
        ),
        const SizedBox(height: 40),
        SizedBox(height: 220, child: LineChart(_lineChartData())),
      ],
    );
  }

  Widget _buildMetricPills() {
    return Row(
      children: metricLabels.keys.map((key) {
        bool isSel = activeMetric == key;
        return GestureDetector(
          onTap: () {
            setState(() => activeMetric = key);
            _updateGraphLine();
          },
          child: Container(
            margin: const EdgeInsets.only(right: 6),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
                color: isSel ? kAccent : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: isSel ? kAccent : Colors.white24)),
            child: Text(metricLabels[key]!,
                style: GoogleFonts.plusJakartaSans(color: isSel ? kPrimary : Colors.white70, fontWeight: FontWeight.w900, fontSize: 9)),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildTerminalDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      height: 32,
      decoration: BoxDecoration(color: Colors.white10, borderRadius: BorderRadius.circular(10)),
      child: DropdownButton<String>(
        value: selectedTicker,
        dropdownColor: kCardColor,
        underline: const SizedBox(),
        icon: Icon(Icons.keyboard_arrow_down, color: kAccent, size: 16),
        items: nifty15.map((e) => DropdownMenuItem(value: e['symbol'].toString(), child: Text(e['symbol'], style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)))).toList(),
        onChanged: (v) {
          if (v != null) {
            setState(() => selectedTicker = v);
            _fetchHistory(v);
          }
        },
      ),
    );
  }

  LineChartData _lineChartData() {
    return LineChartData(
      gridData: const FlGridData(show: false),
      titlesData: const FlTitlesData(show: false),
      borderData: FlBorderData(show: false),
      lineBarsData: [
        LineChartBarData(
          spots: chartSpots,
          isCurved: true,
          color: kAccent,
          barWidth: 2,
          isStrokeCapRound: true,
          dotData: const FlDotData(show: false),
          belowBarData: BarAreaData(show: true, gradient: LinearGradient(colors: [kAccent.withOpacity(0.15), Colors.transparent], begin: Alignment.topCenter, end: Alignment.bottomCenter)),
        )
      ],
    );
  }

  Widget _buildVolumeContent() {
    return Row(
      children: [
        SizedBox(
          width: 100, height: 100,
          child: PieChart(
            PieChartData(
              sectionsSpace: 4,
              centerSpaceRadius: 30,
              sections: volumeData.asMap().entries.map((e) {
                return PieChartSectionData(
                  value: e.value['percentage'].toDouble(),
                  color: sectorColors[e.key % sectorColors.length],
                  radius: 14,
                  showTitle: false,
                );
              }).toList(),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: volumeData.take(4).map((e) {

              int idx = volumeData.indexOf(e);
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  children: [
                    Container(width: 6, height: 6, decoration: BoxDecoration(color: sectorColors[idx % sectorColors.length], shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    Expanded(child: Text(e['sector'], style: GoogleFonts.plusJakartaSans(fontSize: 10, color: Colors.white70, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
                    Text("${e['percentage']}%", style: GoogleFonts.plusJakartaSans(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w800)),
                  ],
                ),
              );
            }).toList(),
          ),
        )
      ],
    );
  }

  Widget _buildBarContent() {
    return SizedBox(
      height: 200,
      child: BarChart(
        BarChartData(
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 40,
                getTitlesWidget: (v, m) {
                  if (v.toInt() >= barData.length) return const SizedBox();
                  return SideTitleWidget(
                    axisSide: m.axisSide,
                    space: 8,
                    child: Transform.rotate(
                      angle: -0.6,
                      child: Text(barData[v.toInt()]['symbol'], style: GoogleFonts.plusJakartaSans(color: Colors.white54, fontSize: 8, fontWeight: FontWeight.bold)),
                    ),
                  );
                },
              ),
            ),
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          barGroups: barData.asMap().entries.map((e) => BarChartGroupData(x: e.key, barRods: [BarChartRodData(toY: e.value['market_cap'] / 1e12, color: kAccent.withOpacity(0.8), width: 10, borderRadius: BorderRadius.circular(4))])).toList(),
        ),
      ),
    );
  }

  // FIXED TABLE SPACING: Adjusted flex values to give Identifier 4 and others 2/3
  Widget _buildTerminalTable() {
    return Container(
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(24), border: Border.all(color: kGlassBorder)),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(flex: 4, child: Text("IDENTIFIER", style: GoogleFonts.plusJakartaSans(color: kAccent, fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 1.2))),
                Expanded(flex: 2, child: Text("P/E", style: GoogleFonts.plusJakartaSans(color: kAccent, fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 1.2))),
                Expanded(flex: 3, child: Text("VOL", style: GoogleFonts.plusJakartaSans(color: kAccent, fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 1.2))),
                Expanded(flex: 3, child: Text("REV", textAlign: TextAlign.right, style: GoogleFonts.plusJakartaSans(color: kAccent, fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 1.2))),
              ],
            ),
          ),
          ...tableData.map((s) {
            bool isPos = (double.tryParse(s['revenue_yoy'].toString()) ?? 0) >= 0;
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: kGlassBorder))),
              child: Row(
                children: [
                  Expanded(flex: 4, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(s['symbol'], style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                    Text(s['company_name'] ?? "N/A", overflow: TextOverflow.ellipsis, maxLines: 1, style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontSize: 9)),
                  ])),
                  Expanded(flex: 2, child: Text("${s['current_pe_ratio']?.toStringAsFixed(1) ?? 'N/A'}", style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 11))),
                  Expanded(flex: 3, child: Text("${(s['volume'] / 1e6).toStringAsFixed(1)}M", style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontWeight: FontWeight.w600, fontSize: 11))),
                  Expanded(flex: 3, child: Text("${isPos ? '+' : ''}${s['revenue_yoy']}%", textAlign: TextAlign.right, style: GoogleFonts.plusJakartaSans(color: isPos ? kAccent : Colors.redAccent, fontWeight: FontWeight.w900, fontSize: 11))),
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }
}