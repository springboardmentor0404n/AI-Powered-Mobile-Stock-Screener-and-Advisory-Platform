import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:google_fonts/google_fonts.dart';

// Import your design system from main.dart if available
// import 'main.dart';

class AiBotScreen extends StatefulWidget {
  const AiBotScreen({super.key});
  @override
  State<AiBotScreen> createState() => _AiBotScreenState();
}

class _AiBotScreenState extends State<AiBotScreen> {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isLoading = false;
  String? _userEmail;

  // --- BRANDED DESIGN SYSTEM (Text remains original, UI is upgraded) ---
  final Color kSpaceBg = const Color(0xFF0B132B); // Deep Space Blue
  final Color kMint = const Color(0xFF6FFFB0);   // Neon Mint
  final Color kCardNavy = const Color(0xFF1C2541);
  final Color kGlassBorder = Colors.white.withOpacity(0.08);

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() => _userEmail = prefs.getString('user_email') ?? "user@example.com");
  }

  Future<void> _handleSearch() async {
    final userQuery = _searchController.text.trim();
    if (userQuery.isEmpty || _isLoading) return;

    setState(() {
      _isLoading = true;
      _messages.add({"text": userQuery, "isUser": true});
    });

    _searchController.clear();
    _scrollToBottom();

    try {
      final response = await http.post(
        Uri.parse("http://localhost:8000/ask"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"question": userQuery}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _addBotMessage(data['answer']);
      } else {
        _addBotMessage("Error: Could not reach advisor.");
      }
    } catch (e) {
      _addBotMessage("Connection Error: Check backend.");
    } finally {
      if (mounted) setState(() => _isLoading = false);
      _scrollToBottom();
    }
  }

  void _addBotMessage(String text) {
    if (mounted) setState(() => _messages.add({"text": text, "isUser": false}));
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(_scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 400), curve: Curves.easeOutQuart);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSpaceBg,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: Colors.white10, shape: BoxShape.circle),
            child: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 16),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Advisory AI',
            style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w800)),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: const Alignment(0.7, -0.5),
            radius: 1.5,
            colors: [kMint.withOpacity(0.05), Colors.transparent],
          ),
        ),
        child: Column(
          children: [
            Expanded(
              child: _messages.isEmpty ? _buildWelcome() : _buildChatList(),
            ),
            _buildInputArea(),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcome() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(25),
            decoration: BoxDecoration(
              color: kMint.withOpacity(0.05),
              shape: BoxShape.circle,
              border: Border.all(color: kMint.withOpacity(0.1)),
            ),
            child: Icon(Icons.auto_awesome_rounded, size: 45, color: kMint),
          ),
          const SizedBox(height: 24),
          Text("Financial Intelligence",
              style: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white)),
          const SizedBox(height: 8),
          Text("Ask about stock analysis or market trends.",
              style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildChatList() {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(20, 100, 20, 20),
      itemCount: _messages.length,
      itemBuilder: (context, index) => _buildMessageBubble(_messages[index]),
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> msg) {
    bool isUser = msg['isUser'];
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
            decoration: BoxDecoration(
              color: isUser ? kMint : kCardNavy.withOpacity(0.8),
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(22),
                topRight: const Radius.circular(22),
                bottomLeft: Radius.circular(isUser ? 22 : 4),
                bottomRight: Radius.circular(isUser ? 4 : 22),
              ),
              border: Border.all(color: isUser ? Colors.transparent : kGlassBorder),
              boxShadow: [
                BoxShadow(
                    color: isUser ? kMint.withOpacity(0.15) : Colors.black26,
                    blurRadius: 12,
                    offset: const Offset(0, 6)
                )
              ],
            ),
            child: isUser
                ? Text(msg['text'],
                style: GoogleFonts.plusJakartaSans(color: kSpaceBg, fontWeight: FontWeight.w700, fontSize: 15))
                : MarkdownBody(
              data: msg['text'],
              styleSheet: MarkdownStyleSheet(
                p: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14, height: 1.6, fontWeight: FontWeight.w500),
                strong: GoogleFonts.plusJakartaSans(color: kMint, fontWeight: FontWeight.w800),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(isUser ? "You" : "Terminal AI",
              style: GoogleFonts.plusJakartaSans(fontSize: 9, color: Colors.white24, fontWeight: FontWeight.w900, letterSpacing: 1)),
        ],
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 15, 20, 35),
      decoration: BoxDecoration(
        color: kSpaceBg,
        border: Border(top: BorderSide(color: kGlassBorder)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              height: 55,
              decoration: BoxDecoration(
                color: kCardNavy.withOpacity(0.6),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: kGlassBorder),
              ),
              child: TextField(
                controller: _searchController,
                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600),
                decoration: InputDecoration(
                  hintText: "Query market data...",
                  hintStyle: GoogleFonts.plusJakartaSans(color: Colors.white24, fontSize: 14),
                  border: InputBorder.none,
                ),
                onSubmitted: (_) => _handleSearch(),
              ),
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: _handleSearch,
            child: Container(
              width: 55, height: 55,
              decoration: BoxDecoration(
                color: kMint,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: kMint.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 4))],
              ),
              child: _isLoading
                  ? const Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Color(0xFF0B132B), strokeWidth: 3)))
                  : const Icon(Icons.send_rounded, color: Color(0xFF0B132B), size: 22),
            ),
          ),
        ],
      ),
    );
  }
}