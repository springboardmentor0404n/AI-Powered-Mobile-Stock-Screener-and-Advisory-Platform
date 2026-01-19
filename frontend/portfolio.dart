import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

// Import your design system from main.dart
import 'main.dart';

class GrowwPortfolioPage extends StatefulWidget {
  final String userId;
  final String baseUrl = "http://localhost:8000";

  const GrowwPortfolioPage({super.key, required this.userId});

  @override
  _GrowwPortfolioPageState createState() => _GrowwPortfolioPageState();
}

class _GrowwPortfolioPageState extends State<GrowwPortfolioPage> {
  Map<String, dynamic>? portfolioData;
  List<dynamic> displayStocks = [];
  bool isLoading = true;
  bool isSearching = false;
  TextEditingController searchController = TextEditingController();

  // --- Design System ---
  final Color kSpaceBg = const Color(0xFF0B132B);
  final Color kMint = const Color(0xFF6FFFB0);
  final Color kCardNavy = const Color(0xFF1C2541);
  final Color kLoss = const Color(0xFFFF5E5E);
  final Color kGlassBorder = Colors.white.withOpacity(0.08);

  @override
  void initState() {
    super.initState();
    _initialLoad();
  }

  Future<void> _initialLoad() async {
    setState(() => isLoading = true);
    await Future.wait([_fetchPortfolio(), _fetchNifty15()]);
    setState(() => isLoading = false);
  }

  Future<void> _fetchPortfolio() async {
    try {
      final r = await http.get(Uri.parse("${widget.baseUrl}/user/portfolio/${widget.userId}"));
      if (r.statusCode == 200) setState(() => portfolioData = jsonDecode(r.body));
    } catch (e) { debugPrint("Portfolio Error: $e"); }
  }

  Future<void> _fetchNifty15() async {
    try {
      final r = await http.get(Uri.parse("${widget.baseUrl}/stocks/nifty15"));
      if (r.statusCode == 200) setState(() => displayStocks = jsonDecode(r.body));
    } catch (e) { debugPrint("Nifty Error: $e"); }
  }

  Future<void> _onSearchChanged(String query) async {
    if (query.isEmpty) {
      setState(() => isSearching = false);
      _fetchNifty15();
      return;
    }
    setState(() => isSearching = true);
    try {
      final r = await http.get(Uri.parse("${widget.baseUrl}/stocks/search?query=$query"));
      if (r.statusCode == 200) setState(() => displayStocks = jsonDecode(r.body));
    } catch (e) { debugPrint("Search Error: $e"); }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) return Scaffold(backgroundColor: kSpaceBg, body: Center(child: CircularProgressIndicator(color: kMint, strokeWidth: 2)));

    return Scaffold(
      backgroundColor: kSpaceBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("ASSET MANAGEMENT",
                style: GoogleFonts.plusJakartaSans(color: kMint, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 2)),
            Text("My Portfolio",
                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 24)),
          ],
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: const Alignment(1, -0.5),
            radius: 1.5,
            colors: [kMint.withOpacity(0.05), Colors.transparent],
          ),
        ),
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSearchBar(),
              if (!isSearching) ...[
                _buildSummaryCard(),
                _buildSectionTitle("Current Holdings"),
                _buildHoldingsList(),
              ],
              _buildSectionTitle(isSearching ? "Search Results" : "Explore Top Assets"),
              _buildExploreList(),
              const SizedBox(height: 50),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Container(
        decoration: BoxDecoration(
          color: kCardNavy.withOpacity(0.5),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: kGlassBorder),
        ),
        child: TextField(
          controller: searchController,
          onChanged: _onSearchChanged,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: "Search ticker or company...",
            hintStyle: const TextStyle(color: Colors.white24, fontSize: 14),
            prefixIcon: Icon(Icons.search_rounded, color: kMint, size: 20),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 15),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 30, 16, 12),
      child: Text(title,
          style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.5)),
    );
  }

  Widget _buildSummaryCard() {
    final invNum = portfolioData?['total_invested'] ?? 0.0;
    final curNum = portfolioData?['current_value'] ?? 0.0;
    final retNum = portfolioData?['total_returns'] ?? 0.0;

    // Check if values are zero to hide them or show placeholder
    final inv = invNum == 0.0 ? "  " : "₹${invNum.toStringAsFixed(2)}";
    final cur = curNum == 0.0 ? "  " : "₹${curNum.toStringAsFixed(2)}";
    final ret = retNum == 0.0 ? "0.00" : "₹${retNum.toStringAsFixed(2)}";

    final bool isProfit = retNum >= 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: kCardNavy,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: kGlassBorder),
        boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 20, offset: Offset(0, 10))],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _summaryItem("INVESTED", inv),
              const SizedBox(width: 10),
              _summaryItem("CURRENT", cur),
            ],
          ),
          const SizedBox(height: 25),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kGlassBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text("Overall Returns",
                      style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontWeight: FontWeight.bold, fontSize: 13)),
                ),
                Text("${isProfit && retNum != 0 ? '+' : ''}$ret",
                    style: GoogleFonts.plusJakartaSans(color: isProfit ? kMint : kLoss, fontWeight: FontWeight.w900, fontSize: 22)),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _summaryItem(String l, String v) => Expanded(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l, style: GoogleFonts.plusJakartaSans(color: Colors.white24, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1)),
        const SizedBox(height: 6),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(v, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
        ),
      ],
    ),
  );

  Widget _buildHoldingsList() {
    final holdings = portfolioData?['holdings'] ?? [];
    if (holdings.isEmpty) return _buildEmptyState("No assets held currently");
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: holdings.length,
      itemBuilder: (context, i) => _buildStockItem(holdings[i], isHolding: true),
    );
  }

  Widget _buildExploreList() {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: displayStocks.length,
      itemBuilder: (context, i) => _buildStockItem(displayStocks[i], isHolding: false),
    );
  }

  Widget _buildEmptyState(String msg) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40.0),
        child: Text(msg, style: const TextStyle(color: Colors.white24, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildStockItem(dynamic stock, {required bool isHolding}) {
    // Logic to handle 0.00 display
    final priceValue = isHolding ? stock['current_value'] : stock['close_price'];
    final displayPrice = (priceValue == null || priceValue == 0 || priceValue == 0.0)
        ? "   "
        : "₹${priceValue.toString()}";

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kCardNavy.withOpacity(0.4),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: kGlassBorder),
      ),
      child: InkWell(
        onTap: () async {
          final res = await Navigator.push(context, MaterialPageRoute(builder: (context) =>
              StockDetailView(symbol: stock['symbol'], baseUrl: widget.baseUrl, userId: widget.userId)));
          if (res == true) _initialLoad();
        },
        child: Row(
          children: [
            Container(
              width: 50, height: 50,
              decoration: BoxDecoration(color: kMint.withOpacity(0.1), borderRadius: BorderRadius.circular(15)),
              alignment: Alignment.center,
              child: Text(stock['symbol'][0], style: TextStyle(color: kMint, fontWeight: FontWeight.w900, fontSize: 20)),
            ),
            const SizedBox(width: 16),
            Expanded(
              flex: 4,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(stock['symbol'],
                      style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 16),
                      overflow: TextOverflow.ellipsis),
                  Text(isHolding ? "${stock['quantity']} Units" : (stock['company_name'] ?? ""),
                      style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            Expanded(
              flex: 3,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(displayPrice,
                        style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, fontSize: 15, color: Colors.white)),
                  ),
                  const SizedBox(height: 4),
                  Icon(Icons.arrow_forward_ios_rounded, size: 12, color: kMint.withOpacity(0.5)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class StockDetailView extends StatefulWidget {
  final String symbol, baseUrl, userId;
  const StockDetailView({super.key, required this.symbol, required this.baseUrl, required this.userId});

  @override
  _StockDetailViewState createState() => _StockDetailViewState();
}

class _StockDetailViewState extends State<StockDetailView> {
  Map<String, dynamic>? details;
  bool loading = true;
  // REMOVED 1M Period: Defaulting to 3M for better visibility
  String selectedPeriod = "3M";
  final List<String> periods = ["3M", "6M", "1Y", "3Y"];

  final Color kMint = const Color(0xFF6FFFB0);
  final Color kSpaceBg = const Color(0xFF0B132B);
  final Color kCardNavy = const Color(0xFF1C2541);

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => loading = true);
    final r = await http.get(Uri.parse("${widget.baseUrl}/stocks/details/${widget.symbol}?period=$selectedPeriod"));
    if (r.statusCode == 200) setState(() { details = jsonDecode(r.body); loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (loading && details == null) return Scaffold(backgroundColor: kSpaceBg, body: Center(child: CircularProgressIndicator(color: kMint)));

    final stats = details!['stats'];
    final spots = (details!['graph_data'] as List).asMap().entries.map((e) =>
        FlSpot(e.key.toDouble(), (e.value['price'] as num).toDouble())).toList();

    return Scaffold(
      backgroundColor: kSpaceBg,
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20), onPressed: () => Navigator.pop(context)),
        backgroundColor: Colors.transparent, elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(stats),
            _buildPeriodSelector(),
            const SizedBox(height: 20),
            _buildChartSection(spots),
            _buildStatsGrid(stats),
            const SizedBox(height: 120),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomAction(stats),
    );
  }

  Widget _buildHeader(dynamic stats) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(stats['company_name'] ?? "", style: GoogleFonts.plusJakartaSans(color: kMint, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1)),
        Text(stats['symbol'] ?? '', style: GoogleFonts.plusJakartaSans(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -1)),
        const SizedBox(height: 8),
        Text("₹${stats['close_price'] ?? '0.00'}", style: GoogleFonts.plusJakartaSans(fontSize: 30, fontWeight: FontWeight.w900, color: Colors.white)),
      ]),
    );
  }

  Widget _buildPeriodSelector() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(color: kCardNavy, borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white10)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: periods.map((p) {
          bool isSelected = selectedPeriod == p;
          return GestureDetector(
            onTap: () { setState(() => selectedPeriod = p); _load(); },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(color: isSelected ? kMint : Colors.transparent, borderRadius: BorderRadius.circular(14)),
              child: Text(p, style: TextStyle(color: isSelected ? kSpaceBg : Colors.white38, fontWeight: FontWeight.w900, fontSize: 11)),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildChartSection(List<FlSpot> spots) {
    return Container(
      height: 250,
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: LineChart(LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: const FlTitlesData(show: false),
        borderData: FlBorderData(show: false),
        lineBarsData: [LineChartBarData(
          spots: spots, isCurved: true, color: kMint, barWidth: 4, dotData: const FlDotData(show: false),
          belowBarData: BarAreaData(show: true, gradient: LinearGradient(colors: [kMint.withOpacity(0.2), Colors.transparent], begin: Alignment.topCenter, end: Alignment.bottomCenter)),
        )],
      )),
    );
  }

  Widget _buildStatsGrid(dynamic s) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text("Market Fundamentals", style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
        const SizedBox(height: 20),
        Row(children: [
          _statBox("MARKET CAP", "₹${s['market_cap']?.toString() ?? 'N/A'}", Icons.account_balance_wallet_rounded),
          const SizedBox(width: 16),
          _statBox("P/E RATIO", s['current_pe_ratio']?.toString() ?? 'N/A', Icons.data_exploration_rounded),
        ]),
      ]),
    );
  }

  Widget _statBox(String l, String v, IconData i) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: kCardNavy.withOpacity(0.5), borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.white10)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(i, size: 20, color: kMint),
        const SizedBox(height: 16),
        Text(l, style: GoogleFonts.plusJakartaSans(color: Colors.white24, fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 1)),
        Text(v, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.white)),
      ]),
    ),
  );

  Widget _buildBottomAction(dynamic stats) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 30),
      decoration: BoxDecoration(color: kSpaceBg, border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05)))),
      child: Row(children: [
        Expanded(child: _btn("LIQUIDATE", const Color(0xFFFF5E5E).withOpacity(0.1), const Color(0xFFFF5E5E), () {})),
        const SizedBox(width: 16),
        Expanded(child: _btn("ACCUMULATE", kMint, kSpaceBg, () => _buy(stats))),
      ]),
    );
  }

  Widget _btn(String t, Color bg, Color text, VoidCallback tap) => ElevatedButton(
    onPressed: tap,
    style: ElevatedButton.styleFrom(backgroundColor: bg, foregroundColor: text, minimumSize: const Size(0, 64), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)), elevation: 0),
    child: Text(t, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.5)),
  );

  void _buy(dynamic s) {
    int q = 1;
    showModalBottomSheet(context: context, isScrollControlled: true, backgroundColor: Colors.transparent, builder: (ctx) => Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 24, right: 24, top: 24),
      decoration: BoxDecoration(color: kCardNavy, borderRadius: const BorderRadius.vertical(top: Radius.circular(32)), border: Border.all(color: Colors.white10)),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text("ORDER QUANTITY", style: GoogleFonts.plusJakartaSans(color: kMint, fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 2)),
        const SizedBox(height: 20),
        TextField(
          keyboardType: TextInputType.number,
          autofocus: true,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.white),
          decoration: InputDecoration(hintText: "0", hintStyle: const TextStyle(color: Colors.white10), filled: true, fillColor: kSpaceBg, border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none)),
          onChanged: (v) => q = int.tryParse(v) ?? 1,
        ),
        const SizedBox(height: 30),
        _btn("EXECUTE TRADE", kMint, kSpaceBg, () async {
          await http.post(Uri.parse("${widget.baseUrl}/user/portfolio/buy"),
              headers: {"Content-Type": "application/json"},
              body: jsonEncode({"user_id": widget.userId, "symbol": s['symbol'], "quantity": q, "price": (s['close_price'] as num).toDouble()}));
          Navigator.pop(ctx);
          Navigator.pop(context, true);
        }),
        const SizedBox(height: 30),
      ]),
    ));
  }
}