import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:candlesticks/candlesticks.dart';
import 'package:google_fonts/google_fonts.dart';

// Ensure this matches your project structure to access kPrimaryColor, etc.
import 'main.dart';

class LiveDataPage extends StatefulWidget {
  final String symbol;
  const LiveDataPage({super.key, this.symbol = "INFY"});

  @override
  State<LiveDataPage> createState() => _LiveDataPageState();
}

class _LiveDataPageState extends State<LiveDataPage> with SingleTickerProviderStateMixin {
  List<Candle> candles = [];
  bool isLoading = true;
  String currentSymbol = "";
  final TextEditingController _searchController = TextEditingController();

  // High-End Design Palette (Synced with your Splash Screen)
  final Color kSpaceBg = const Color(0xFF0B132B);
  final Color kMint = const Color(0xFF6FFFB0);
  final Color kCardNavy = const Color(0xFF1C2541);
  final Color kLoss = const Color(0xFFFF5E5E);
  final Color kGlassBorder = Colors.white.withOpacity(0.08);

  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    currentSymbol = widget.symbol;
    _fetchInitialCandles(currentSymbol);

    // Subtle breathing animation for the 'LIVE' indicator
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  // CORE LOGIC: Preserved from your original code
  Future<void> _fetchInitialCandles(String symbol) async {
    if (symbol.isEmpty) return;
    final previousSymbol = currentSymbol;

    setState(() => isLoading = true);

    try {
      final response = await http.get(
        Uri.parse("http://localhost:8000/stocks/candles/${symbol.trim().toUpperCase()}"),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            currentSymbol = symbol.trim().toUpperCase();
            candles = data.map((item) => Candle(
              date: DateTime.parse(item['date']),
              high: (item['high'] as num).toDouble(),
              low: (item['low'] as num).toDouble(),
              open: (item['open'] as num).toDouble(),
              close: (item['close'] as num).toDouble(),
              volume: (item['volume'] as num).toDouble(),
            )).toList().reversed.toList();
            isLoading = false;
          });
        }
      } else {
        throw Exception("Not Found");
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          isLoading = false;
          currentSymbol = previousSymbol;
        });
        _showError("Symbol '$symbol' not found in database.");
      }
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold)),
        backgroundColor: kLoss,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSpaceBg,
      body: Stack(
        children: [
          // Background Glow effect
          Positioned(
            top: -100,
            right: -50,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: kMint.withOpacity(0.03),
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                _buildHeader(),
                _buildSearchSection(),
                if (isLoading)
                  Expanded(child: Center(child: CircularProgressIndicator(color: kMint, strokeWidth: 2)))
                else ...[
                  _buildHeroPrice(),
                  Expanded(child: _buildChartFrame()),
                  _buildBottomStatsDock(),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("LIVE TERMINAL",
                  style: GoogleFonts.plusJakartaSans(color: kMint, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 2)),
              Text("Market Stream",
                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 24)),
            ],
          ),
          _buildLiveBadge(),
        ],
      ),
    );
  }

  Widget _buildLiveBadge() {
    return FadeTransition(
      opacity: Tween(begin: 0.4, end: 1.0).animate(_pulseController),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: kMint.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: kMint.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Container(width: 6, height: 6, decoration: BoxDecoration(color: kMint, shape: BoxShape.circle)),
            const SizedBox(width: 6),
            Text("LIVE", style: GoogleFonts.plusJakartaSans(color: kMint, fontSize: 10, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchSection() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: kGlassBorder),
        ),
        child: TextField(
          controller: _searchController,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          decoration: InputDecoration(
            hintText: "Search Asset (e.g. TCS, INFY)",
            hintStyle: TextStyle(color: Colors.white38, fontSize: 14),
            icon: Icon(Icons.search_rounded, color: kMint, size: 20),
            border: InputBorder.none,
          ),
          onSubmitted: (val) {
            _fetchInitialCandles(val);
            _searchController.clear();
          },
        ),
      ),
    );
  }

  Widget _buildHeroPrice() {
    if (candles.isEmpty) return const SizedBox();
    final latest = candles.last;
    final bool isUp = latest.close >= latest.open;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(currentSymbol,
                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900, letterSpacing: -1)),
              Text("NSE REAL-TIME DATA",
                  style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text("₹${latest.close.toStringAsFixed(2)}",
                  style: GoogleFonts.plusJakartaSans(color: isUp ? kMint : kLoss, fontSize: 28, fontWeight: FontWeight.w900)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: (isUp ? kMint : kLoss).withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                child: Text("${isUp ? '▲' : '▼'} ${((latest.close - latest.open)/latest.open * 100).toStringAsFixed(2)}%",
                    style: GoogleFonts.plusJakartaSans(color: isUp ? kMint : kLoss, fontWeight: FontWeight.w900, fontSize: 12)),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildChartFrame() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: kCardNavy,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: kGlassBorder),
        boxShadow: [BoxShadow(color: Colors.black38, blurRadius: 25, offset: const Offset(0, 10))],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: candles.isEmpty
            ? _buildErrorPlaceholder()
            : Candlesticks(
          key: ValueKey(currentSymbol),
          candles: candles,
        ),
      ),
    );
  }

  Widget _buildBottomStatsDock() {
    if (candles.isEmpty) return const SizedBox();
    final latest = candles.last;
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kGlassBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _statTile("DAY HIGH", latest.high, kMint),
          _statTile("DAY LOW", latest.low, kLoss),
          _statTile("VOLUME", latest.volume / 1000, Colors.blueAccent, isK: true),
        ],
      ),
    );
  }

  Widget _statTile(String label, double val, Color color, {bool isK = false}) {
    return Column(
      children: [
        Text(label, style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 1)),
        const SizedBox(height: 6),
        Text(isK ? "${val.toStringAsFixed(1)}K" : "₹${val.toStringAsFixed(1)}",
            style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Container(width: 15, height: 2, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
      ],
    );
  }

  Widget _buildErrorPlaceholder() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.bar_chart_rounded, color: kMint.withOpacity(0.1), size: 100),
          const SizedBox(height: 10),
          Text("SYNCING WITH EXCHANGE...",
              style: GoogleFonts.plusJakartaSans(color: Colors.white24, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 2)),
        ],
      ),
    );
  }
}