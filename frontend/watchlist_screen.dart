import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:fl_chart/fl_chart.dart';

// Accessing global constants from main.dart
import 'main.dart';

class WatchlistScreen extends StatefulWidget {
  const WatchlistScreen({super.key});

  @override
  State<WatchlistScreen> createState() => _WatchlistScreenState();
}

class _WatchlistScreenState extends State<WatchlistScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final String userEmail = "user_01";
  final String baseUrl = "http://localhost:8000";

  List<dynamic> marketStocks = [];
  List<dynamic> watchlist = [];
  bool isLoading = true;

  // --- BRANDED DESIGN SYSTEM (Synced with Splash/Dashboard) ---
  final Color kSpaceBg = const Color(0xFF0B132B); // Deep Space Blue
  final Color kMint = const Color(0xFF6FFFB0);   // Neon Mint
  final Color kCardNavy = const Color(0xFF1C2541);
  final Color kLoss = const Color(0xFFFF5E5E);
  final Color kGlassBorder = Colors.white.withOpacity(0.08);

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchData();
  }

  Future<void> _fetchData() async {
    if (mounted) setState(() => isLoading = true);
    try {
      final marketRes = await http.get(Uri.parse("$baseUrl/stocks/nifty15"));
      final watchRes = await http.get(Uri.parse("$baseUrl/watchlist/$userEmail"));

      if (mounted) {
        setState(() {
          marketStocks = jsonDecode(marketRes.body);
          watchlist = jsonDecode(watchRes.body);
          isLoading = false;
        });
      }
    } catch (e) {
      debugPrint("Error fetching data: $e");
      if (mounted) setState(() => isLoading = false);
    }
  }

  Future<void> _addToWatchlist(String symbol) async {
    try {
      await http.post(Uri.parse("$baseUrl/watchlist/add?email=$userEmail&symbol=$symbol"));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("$symbol Added to Watchlist", style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, color: kSpaceBg)),
            backgroundColor: kMint,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
      _fetchData();
    } catch (e) {
      debugPrint("Error: $e");
    }
  }

  Future<void> _removeFromWatchlist(String symbol) async {
    try {
      final response = await http.delete(Uri.parse("$baseUrl/watchlist/remove?email=$userEmail&symbol=$symbol"));
      if (response.statusCode == 200) {
        debugPrint("Removed $symbol");
      }
    } catch (e) {
      debugPrint("Error: $e");
    }
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
            center: const Alignment(0.8, -0.6),
            radius: 1.2,
            colors: [kMint.withOpacity(0.05), Colors.transparent],
          ),
        ),
        child: isLoading
            ? Center(child: CircularProgressIndicator(color: kMint))
            : Column(
          children: [
            const SizedBox(height: 110), // AppBar Space
            _buildModernTabBar(),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildStockList(marketStocks, isMarket: true),
                  _buildStockList(watchlist, isMarket: false),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("QUANTITATIVE",
              style: GoogleFonts.plusJakartaSans(color: kMint, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 2.5)),
          Text("Market Explore",
              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 24)),
        ],
      ),
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 16),
          child: IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: kMint.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(Icons.search_rounded, color: kMint, size: 20),
            ),
            onPressed: () => _showSearchModal(),
          ),
        ),
      ],
    );
  }

  Widget _buildModernTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      height: 50,
      decoration: BoxDecoration(
        color: kCardNavy.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kGlassBorder),
      ),
      child: TabBar(
        controller: _tabController,
        labelColor: kSpaceBg,
        unselectedLabelColor: Colors.white60,
        indicatorSize: TabBarIndicatorSize.tab,
        indicator: BoxDecoration(
          color: kMint,
          borderRadius: BorderRadius.circular(12),
        ),
        indicatorPadding: const EdgeInsets.symmetric(horizontal: -2, vertical: 4),
        dividerColor: Colors.transparent,
        labelStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 13),
        tabs: const [
          Tab(child: Center(child: Text("Discover"))),
          Tab(child: Center(child: Text("My Watchlist"))),
        ],
      ),
    );
  }

  Widget _buildStockList(List<dynamic> stocks, {required bool isMarket}) {
    if (stocks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.auto_graph_rounded, color: Colors.white10, size: 80),
            const SizedBox(height: 16),
            Text(isMarket ? "Syncing Market Data..." : "Your Watchlist is Empty",
                style: GoogleFonts.plusJakartaSans(color: Colors.white24, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
      itemCount: stocks.length,
      itemBuilder: (context, index) {
        final stock = stocks[index];
        final String symbol = stock['symbol'];
        final double price = (stock['price'] ?? 0.0).toDouble();
        final double change = (stock['change_percent'] ?? 0.0).toDouble();
        final bool isPositive = change >= 0;

        Widget card = Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: kCardNavy.withOpacity(0.6),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: kGlassBorder),
          ),
          child: InkWell(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => StockDetailScreen(symbol: symbol))),
            child: Row(
              children: [
                _buildCompanyLogo(symbol),
                const SizedBox(width: 12),
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(symbol, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, fontSize: 17, color: Colors.white)),
                      Text(stock['company_name'] ?? "",
                          style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: SizedBox(
                    height: 35,
                    child: FutureBuilder<List<double>>(
                      future: _fetchGraphData(symbol),
                      builder: (context, snapshot) {
                        if (!snapshot.hasData || snapshot.data!.isEmpty) return const SizedBox();
                        return _buildSparkline(snapshot.data!);
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      // REMOVED: ₹0.0 logic. Now shows price on Watchlist and only "+ ADD" on Discover
                      if (!isMarket)
                        Text("₹${price.toStringAsFixed(1)}",
                            style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.white))
                      else
                        const SizedBox(height: 18),

                      const SizedBox(height: 4),
                      if (isMarket)
                        GestureDetector(
                          onTap: () => _addToWatchlist(symbol),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(color: kMint.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                            child: Text("+ ADD", style: GoogleFonts.plusJakartaSans(color: kMint, fontSize: 11, fontWeight: FontWeight.w900)),
                          ),
                        )
                      else
                        Text("${isPositive ? '▲' : '▼'} ${change.abs().toStringAsFixed(2)}%",
                            style: GoogleFonts.plusJakartaSans(color: isPositive ? kMint : kLoss, fontSize: 12, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );

        return isMarket ? card : Dismissible(
          key: Key(symbol),
          direction: DismissDirection.endToStart,
          background: Container(
            alignment: Alignment.centerRight,
            padding: const EdgeInsets.only(right: 20),
            decoration: BoxDecoration(color: kLoss.withOpacity(0.2), borderRadius: BorderRadius.circular(24)),
            child: Icon(Icons.delete_sweep_rounded, color: kLoss),
          ),
          onDismissed: (_) {
            setState(() => stocks.removeAt(index));
            _removeFromWatchlist(symbol);
          },
          child: card,
        );
      },
    );
  }

  Widget _buildCompanyLogo(String symbol) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: kMint.withOpacity(0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kMint.withOpacity(0.1)),
      ),
      alignment: Alignment.center,
      child: Text(symbol[0], style: GoogleFonts.plusJakartaSans(color: kMint, fontWeight: FontWeight.w900, fontSize: 18)),
    );
  }

  Future<List<double>> _fetchGraphData(String symbol) async {
    try {
      final res = await http.get(Uri.parse("$baseUrl/stocks/graph/$symbol"));
      if (res.statusCode == 200) return List<double>.from(jsonDecode(res.body));
    } catch (_) {}
    return [];
  }

  Widget _buildSparkline(List<double> data) {
    bool isUp = data.last >= data.first;
    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: const FlTitlesData(show: false),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: data.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value)).toList(),
            isCurved: true,
            color: isUp ? kMint : kLoss,
            barWidth: 2.5,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                    colors: [(isUp ? kMint : kLoss).withOpacity(0.15), Colors.transparent],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter
                )
            ),
          ),
        ],
      ),
    );
  }







  void _showSearchModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => SearchOverlay(onAdd: _addToWatchlist, baseUrl: baseUrl),
    );
  }
}

// --- SEARCH OVERLAY WITH TERMINAL UI ---
class SearchOverlay extends StatefulWidget {
  final Function(String) onAdd;
  final String baseUrl;
  const SearchOverlay({super.key, required this.onAdd, required this.baseUrl});
  @override
  SearchOverlayState createState() => SearchOverlayState();
}

class SearchOverlayState extends State<SearchOverlay> {
  List<dynamic> results = [];
  final Color kMint = const Color(0xFF6FFFB0);
  final Color kSpaceBg = const Color(0xFF0B132B);
  final Color kCardNavy = const Color(0xFF1C2541);

  void _search(String query) async {
    if (query.isEmpty) { setState(() => results = []); return; }
    try {
      final res = await http.get(Uri.parse("${widget.baseUrl}/stocks/search?query=$query"));
      if (mounted && res.statusCode == 200) {
        setState(() => results = jsonDecode(res.body));
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: BoxDecoration(
        color: kSpaceBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2))),
          Padding(
            padding: const EdgeInsets.all(24),
            child: TextField(
              autofocus: true,
              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold),
              cursorColor: kMint,
              decoration: InputDecoration(
                hintText: "Search Asset (e.g. RELIANCE)",
                hintStyle: const TextStyle(color: Colors.white24),
                prefixIcon: Icon(Icons.search_rounded, color: kMint),
                filled: true,
                fillColor: kCardNavy,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
              ),
              onChanged: _search,
            ),
          ),
          Expanded(
            child: results.isEmpty
                ? const Center(child: Text("Start typing to explore", style: TextStyle(color: Colors.white24)))
                : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: results.length,
              itemBuilder: (context, index) {
                final stock = results[index];
                return ListTile(
                  leading: CircleAvatar(backgroundColor: kMint.withOpacity(0.1), child: Text(stock['symbol'][0], style: TextStyle(color: kMint))),
                  title: Text(stock['symbol'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  subtitle: Text(stock['company_name'] ?? "", style: const TextStyle(color: Colors.white38, fontSize: 12)),
                  trailing: Icon(Icons.add_circle_outline, color: kMint),
                  onTap: () { widget.onAdd(stock['symbol']); Navigator.pop(context); },
                );
              },
            ),
          )
        ],
      ),
    );
  }
}

// --- ENHANCED STOCK DETAIL SCREEN WITH 3-MONTH GRAPH ---
class StockDetailScreen extends StatefulWidget {
  final String symbol;
  const StockDetailScreen({super.key, required this.symbol});

  @override
  State<StockDetailScreen> createState() => _StockDetailScreenState();
}

class _StockDetailScreenState extends State<StockDetailScreen> {
  bool isLoading = true;
  Map<String, dynamic>? stockDetails;
  final String baseUrl = "http://localhost:8000";

  // Design Palette
  final Color kMint = const Color(0xFF6FFFB0);
  final Color kSpaceBg = const Color(0xFF0B132B);
  final Color kCardNavy = const Color(0xFF1C2541);

  @override
  void initState() {
    super.initState();
    _fetchStockDetails();
  }

  Future<void> _fetchStockDetails() async {
    try {
      // Note: If using Android Emulator, change localhost to 10.0.2.2
      final res = await http.get(Uri.parse("$baseUrl/stocks/details/${widget.symbol}"));
      if (res.statusCode == 200 && mounted) {
        setState(() {
          stockDetails = jsonDecode(res.body);
          isLoading = false;
        });
      }
    } catch (e) {
      debugPrint("Fetch Error: $e");
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSpaceBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: isLoading
          ? Center(child: CircularProgressIndicator(color: kMint))
          : _buildDetailBody(),
    );
  }

  Widget _buildDetailBody() {
    if (stockDetails == null) {
      return const Center(child: Text("Connection Failed", style: TextStyle(color: Colors.white38)));
    }

    final stats = stockDetails!['stats'] ?? {};
    final dynamic rawGraph = stockDetails!['graph_data'];

    // --- ROBUST PARSING LOGIC ---
    List<FlSpot> spots = [];
    if (rawGraph is List) {
      for (int i = 0; i < rawGraph.length; i++) {
        final item = rawGraph[i];
        if (item is Map && item.containsKey('price')) {
          // Force conversion to string then parse to double for safety
          final double? price = double.tryParse(item['price'].toString());
          if (price != null) {
            spots.add(FlSpot(i.toDouble(), price));
          }
        }
      }
    }

    debugPrint("Total spots parsed: ${spots.length}");

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(stats['company_name'] ?? widget.symbol,
              style: GoogleFonts.plusJakartaSans(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white)),
          Text("Institutional Overview",
              style: GoogleFonts.plusJakartaSans(color: kMint, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1.5)),
          const SizedBox(height: 30),

          // --- CHART SECTION ---
          Container(
            height: 250,
            width: double.infinity,
            padding: const EdgeInsets.only(top: 24, right: 24, left: 12, bottom: 12),
            decoration: BoxDecoration(
              color: kCardNavy,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
            ),
            child: spots.length < 2
                ? _buildSyncingView()
                : LineChart(_detailChart(spots)),
          ),

          const SizedBox(height: 30),
          _buildStatsDock(stats['market_cap'] ?? 0, stats['current_pe_ratio'] ?? 0),
        ],
      ),
    );
  }

  Widget _buildSyncingView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: kMint, strokeWidth: 2)),
          const SizedBox(height: 12),
          Text("OPTIMIZING DATA POINTS...",
              style: GoogleFonts.plusJakartaSans(color: Colors.white24, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
        ],
      ),
    );
  }

  LineChartData _detailChart(List<FlSpot> spots) {
    // Determine Y-axis range to "zoom in" on price action
    double minY = spots.map((s) => s.y).reduce((a, b) => a < b ? a : b);
    double maxY = spots.map((s) => s.y).reduce((a, b) => a > b ? a : b);
    double padding = (maxY - minY) * 0.15;
    if (padding == 0) padding = 1.0;

    return LineChartData(
      gridData: const FlGridData(show: false),
      titlesData: const FlTitlesData(show: false),
      borderData: FlBorderData(show: false),
      minY: minY - padding,
      maxY: maxY + padding,
      lineBarsData: [
        LineChartBarData(
          spots: spots,
          isCurved: true,
          color: kMint,
          barWidth: 4,
          isStrokeCapRound: true,
          dotData: const FlDotData(show: false),
          belowBarData: BarAreaData(
            show: true,
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [kMint.withOpacity(0.2), Colors.transparent],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatsDock(num mCap, num pe) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: kMint.withOpacity(0.05),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: kMint.withOpacity(0.1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _statItem("Market Cap", _formatMCap(mCap)),
          _statItem("P/E Ratio", pe.toStringAsFixed(2)),
        ],
      ),
    );
  }

  Widget _statItem(String label, String value) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: GoogleFonts.plusJakartaSans(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.bold)),
      const SizedBox(height: 4),
      Text(value, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
    ],
  );

  String _formatMCap(num n) => n >= 1e12 ? '₹${(n / 1e12).toStringAsFixed(2)}T' : '₹${(n / 1e7).toStringAsFixed(1)}Cr';
}