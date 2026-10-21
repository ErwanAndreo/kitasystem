import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'models/models.dart';
import 'services/api_service.dart';
import 'screens/today_screen.dart';
import 'screens/roster_screen.dart';
import 'screens/requests_screen.dart';
import 'screens/board_and_stats_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const KitaMitarbeiterApp());
}

class KitaMitarbeiterApp extends StatelessWidget {
  const KitaMitarbeiterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KitaPlaner Mitarbeiter',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF16A34A),
          primary: const Color(0xFF16A34A),
          surface: Colors.white,
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF0F172A),
          elevation: 0,
          centerTitle: false,
        ),
      ),
      home: const MainNavigationScreen(),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  List<StaffModel> _allStaff = [];
  StaffModel? _currentUser;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    final staff = await ApiService.getStaff();
    if (mounted) {
      setState(() {
        _allStaff = staff;
        // Default to Lukas Wagner (Erzieher) if available
        _currentUser = staff.firstWhere(
          (s) => s.id == 's_lukas',
          orElse: () => staff.isNotEmpty ? staff.first : StaffModel(
            id: 's_lukas',
            name: 'Lukas Wagner',
            email: 'l.wagner@kita.de',
            phone: '0176-667788',
            role: 'FACHKRAFT',
            qualification: 'Staatl. anerkannter Erzieher',
            isFachkraft: true,
            weeklyHours: 39,
            pin: '6666',
            avatar: 'LW',
            color: '#84cc16',
          ),
        );
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _currentUser == null) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: Color(0xFF16A34A)),
              SizedBox(height: 12),
              Text('Lade KitaPlaner Mitarbeiter-App...', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
            ],
          ),
        ),
      );
    }

    final screens = [
      TodayScreen(
        currentUser: _currentUser!,
        onRefresh: _loadInitialData,
      ),
      RosterScreen(
        currentUser: _currentUser!,
      ),
      RequestsScreen(
        currentUser: _currentUser!,
      ),
      BoardAndStatsScreen(
        currentUser: _currentUser!,
        allStaff: _allStaff,
        onSwitchUser: (newUser) {
          setState(() {
            _currentUser = newUser;
          });
        },
      ),
    ];

    return Scaffold(
      body: SafeArea(
        child: screens[_currentIndex],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: Color(0xFFE2E8F0)),
          ),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
          backgroundColor: Colors.white,
          indicatorColor: const Color(0xFFDCFCE7),
          elevation: 0,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home, color: Color(0xFF15803D)),
              label: 'Heute',
            ),
            NavigationDestination(
              icon: Icon(Icons.calendar_month_outlined),
              selectedIcon: Icon(Icons.calendar_month, color: Color(0xFF15803D)),
              label: 'Dienstplan',
            ),
            NavigationDestination(
              icon: Icon(Icons.swap_horiz_outlined),
              selectedIcon: Icon(Icons.swap_horiz, color: Color(0xFF15803D)),
              label: 'Anträge',
            ),
            NavigationDestination(
              icon: Icon(Icons.account_circle_outlined),
              selectedIcon: Icon(Icons.account_circle, color: Color(0xFF15803D)),
              label: 'Pinnwand',
            ),
          ],
        ),
      ),
    );
  }
}
