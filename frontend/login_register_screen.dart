import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dashboard.dart';
import 'home_screen.dart';
import 'notification_service.dart' as notif_service;

// Consistent with your Main UI
const Color kPrimaryColor = Color(0xFF0B132B); // Deep Space Blue
const Color kAccentColor = Color(0xFF6FFFB0);  // Neon Mint
const Color kCardColor = Color(0xFF1C2541);    // Midnight Navy
const String _kApiBaseUrl = 'http://localhost:8000';

class LoginRegisterScreen extends StatefulWidget {
  const LoginRegisterScreen({super.key});

  @override
  State<LoginRegisterScreen> createState() => _LoginRegisterScreenState();
}

class _LoginRegisterScreenState extends State<LoginRegisterScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _otpController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool isRegisterMode = false; // Default to Login for better UX
  bool isLoading = false;
  bool isOtpSent = false;
  bool _isPasswordVisible = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
        backgroundColor: color.withOpacity(0.9),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(20),
      ),
    );
  }

  // --- API Call: Handle Registration (POST /register) ---
  Future<void> _handleRegistration() async {
    if (!_formKey.currentState!.validate()) return;
    if (_passwordController.text != _confirmPasswordController.text) {
      _showSnackBar('Passwords do not match.', Colors.redAccent);
      return;
    }
    setState(() => isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('$_kApiBaseUrl/register'),
        headers: const {'Content-Type': 'application/json'},
        body: json.encode({'email': _emailController.text, 'password': _passwordController.text}),
      );
      if (response.statusCode == 200) {
        _showSnackBar('Account created! Please login.', kAccentColor);
        setState(() => isRegisterMode = false);
      } else {
        _showSnackBar(json.decode(response.body)['detail'] ?? 'Error', Colors.redAccent);
      }
    } catch (e) {
      _showSnackBar('Network error.', Colors.redAccent);
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> _handleLoginRequestOtp() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('$_kApiBaseUrl/login/request-otp'),
        headers: const {'Content-Type': 'application/json'},
        body: json.encode({'email': _emailController.text, 'password': _passwordController.text}),
      );
      if (response.statusCode == 200) {
        _showSnackBar('OTP sent to your email.', kAccentColor);
        setState(() => isOtpSent = true);
      } else {
        _showSnackBar(json.decode(response.body)['detail'] ?? 'Invalid credentials.', Colors.redAccent);
      }
    } catch (e) {
      _showSnackBar('Network error.', Colors.redAccent);
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> _handleLoginVerifyOtp() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('$_kApiBaseUrl/login/verify-otp'),
        headers: const {'Content-Type': 'application/json'},
        body: json.encode({'email': _emailController.text, 'otp': _otpController.text}),
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('jwt_token', data['access_token']);
        await prefs.setString('user_email', _emailController.text);
        await notif_service.NotificationService.initialize(_emailController.text);

        Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (context) => const DashboardScreen()), (r) => false);
      } else {
        _showSnackBar('Invalid OTP.', Colors.redAccent);
      }
    } catch (e) {
      _showSnackBar('Verification error.', Colors.redAccent);
    } finally {
      setState(() => isLoading = false);
    }
  }

  // --- MODERN UI COMPONENTS ---

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool isPassword = false,
    TextInputType type = TextInputType.text,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: kCardColor.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: TextFormField(
        controller: controller,
        obscureText: isPassword && !_isPasswordVisible,
        keyboardType: type,
        style: GoogleFonts.plusJakartaSans(color: Colors.white),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.plusJakartaSans(color: Colors.white60, fontSize: 14),
          prefixIcon: Icon(icon, color: kAccentColor, size: 20),
          suffixIcon: isPassword
              ? IconButton(
            icon: Icon(_isPasswordVisible ? Icons.visibility : Icons.visibility_off, color: Colors.white38),
            onPressed: () => setState(() => _isPasswordVisible = !_isPasswordVisible),
          )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        ),
        validator: (v) => v!.isEmpty ? 'Required' : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kPrimaryColor,
      body: Stack(
        children: [
          // Background Aesthetic Glow
          Positioned(
            top: -100,
            right: -50,
            child: CircleAvatar(radius: 150, backgroundColor: kAccentColor.withOpacity(0.05)),
          ),

          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 60),
                    // Header Section
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: kAccentColor.withOpacity(0.2)),
                          color: kAccentColor.withOpacity(0.05),
                        ),
                        child: const Icon(Icons.auto_graph_rounded, color: kAccentColor, size: 40),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Center(
                      child: Text(
                        isOtpSent ? "Verification" : (isRegisterMode ? "Create Account" : "Welcome Back"),
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Center(
                      child: Text(
                        isOtpSent ? "Enter the code sent to your email" : "Access your intelligent market insights",
                        textAlign: TextAlign.center,
                        style: GoogleFonts.plusJakartaSans(color: Colors.white54, fontSize: 14),
                      ),
                    ),
                    const SizedBox(height: 40),

                    // Toggle Switch (Animated)
                    if (!isOtpSent)
                      Container(
                        height: 50,
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: kCardColor,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () => setState(() => isRegisterMode = false),
                                child: Container(
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: !isRegisterMode ? kAccentColor : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text("Login", style: GoogleFonts.plusJakartaSans(
                                      fontWeight: FontWeight.bold, color: !isRegisterMode ? kPrimaryColor : Colors.white38
                                  )),
                                ),
                              ),
                            ),
                            Expanded(
                              child: GestureDetector(
                                onTap: () => setState(() => isRegisterMode = true),
                                child: Container(
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: isRegisterMode ? kAccentColor : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text("Register", style: GoogleFonts.plusJakartaSans(
                                      fontWeight: FontWeight.bold, color: isRegisterMode ? kPrimaryColor : Colors.white38
                                  )),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 30),

                    // Input Fields
                    _buildTextField(
                      controller: _emailController,
                      label: "Email Address",
                      icon: Icons.alternate_email_rounded,
                      type: TextInputType.emailAddress,
                    ),

                    if (!isOtpSent)
                      _buildTextField(
                        controller: _passwordController,
                        label: "Password",
                        icon: Icons.lock_outline_rounded,
                        isPassword: true,
                      ),

                    if (isRegisterMode && !isOtpSent)
                      _buildTextField(
                        controller: _confirmPasswordController,
                        label: "Confirm Password",
                        icon: Icons.lock_reset_rounded,
                        isPassword: true,
                      ),

                    if (isOtpSent)
                      _buildTextField(
                        controller: _otpController,
                        label: "6-Digit OTP",
                        icon: Icons.pin_rounded,
                        type: TextInputType.number,
                      ),

                    const SizedBox(height: 10),

                    // Action Button
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: isLoading ? null : (isRegisterMode ? _handleRegistration : (isOtpSent ? _handleLoginVerifyOtp : _handleLoginRequestOtp)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: kAccentColor,
                          foregroundColor: kPrimaryColor,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 0,
                        ),
                        child: isLoading
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: kPrimaryColor))
                            : Text(
                          isOtpSent ? "Verify Now" : (isRegisterMode ? "Create Account" : "Sign In"),
                          style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Social Login Divider
                    if (!isOtpSent) ...[
                      Row(
                        children: [
                          const Expanded(child: Divider(color: Colors.white10)),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text("Or continue with", style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontSize: 12)),
                          ),
                          const Expanded(child: Divider(color: Colors.white10)),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Google Login Button (Modern Style)
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: OutlinedButton.icon(
                          onPressed: () {},
                          icon: const Icon(Icons.g_mobiledata, size: 30, color: Colors.white),
                          label: Text("Google", style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.white10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}