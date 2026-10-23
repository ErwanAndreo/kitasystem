import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'models/models.dart';
import 'services/api_service.dart';
import 'services/i18n_service.dart';
import 'screens/today_screen.dart';
import 'screens/roster_screen.dart';
import 'screens/checklists_screen.dart';
import 'screens/requests_screen.dart';
import 'screens/board_and_stats_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('de_DE', null);
  await initializeDateFormatting('fr_FR', null);
  await initializeDateFormatting('en_US', null);
  await AppI18n.init();
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
    return ValueListenableBuilder<String>(
      valueListenable: AppI18n.currentLocale,
      builder: (context, locale, _) {
        return MaterialApp(
          title: AppI18n.t('app_title'),
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
      },
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
    AppI18n.currentLocale.addListener(_onLocaleChanged);
    _loadInitialData();
  }

  void _onLocaleChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    AppI18n.currentLocale.removeListener(_onLocaleChanged);
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    const initialUserId = String.fromEnvironment('USER_ID', defaultValue: 's_lukas');
    final staff = await ApiService.getStaff();
    if (mounted) {
      setState(() {
        _allStaff = staff;
        _currentUser = staff.firstWhere(
          (s) => s.id == initialUserId,
          orElse: () => staff.isNotEmpty ? staff.first : StaffModel(
            id: initialUserId,
            name: initialUserId == 's_sarah' ? 'Sarah Klein (Mitarbeiter 2)' : 'Lukas Wagner (Mitarbeiter 1)',
            email: initialUserId == 's_sarah' ? 'sarah.k@kita-sonnenschein.de' : 'lukas.w@kita-sonnenschein.de',
            phone: '0176-667788',
            role: 'FACHKRAFT',
            qualification: 'Staatl. anerkannte(r) Erzieher(in)',
            isFachkraft: true,
            weeklyHours: 39,
            pin: initialUserId == 's_sarah' ? '2222' : '6666',
            avatar: initialUserId == 's_sarah' ? 'SK' : 'LW',
            color: initialUserId == 's_sarah' ? '#ec4899' : '#84cc16',
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
      ChecklistsScreen(
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
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFF16A34A),
                borderRadius: BorderRadius.circular(8),
              ),
              alignment: Alignment.center,
              child: Text(
                _currentUser!.avatar,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _currentUser!.name,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    _currentUser!.role,
                    style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Language Switcher Action Button
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: InkWell(
              onTap: () => _showLanguageSelector(context),
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.language, size: 14, color: Color(0xFF16A34A)),
                    const SizedBox(width: 4),
                    Text(
                      AppI18n.currentFlag,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
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
          destinations: [
            NavigationDestination(
              icon: const Icon(Icons.home_outlined),
              selectedIcon: const Icon(Icons.home, color: Color(0xFF15803D)),
              label: AppI18n.t('nav_today'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.calendar_month_outlined),
              selectedIcon: const Icon(Icons.calendar_month, color: Color(0xFF15803D)),
              label: AppI18n.t('nav_roster'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.fact_check_outlined),
              selectedIcon: const Icon(Icons.fact_check, color: Color(0xFF15803D)),
              label: AppI18n.t('nav_checklists'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.swap_horiz_outlined),
              selectedIcon: const Icon(Icons.swap_horiz, color: Color(0xFF15803D)),
              label: AppI18n.t('nav_requests'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.account_circle_outlined),
              selectedIcon: const Icon(Icons.account_circle, color: Color(0xFF15803D)),
              label: AppI18n.t('nav_board'),
            ),
          ],
        ),
      ),
    );
  }

  void _showLanguageSelector(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      AppI18n.t('select_language'),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildLangOption(ctx, 'de', '🇩🇪 Deutsch', 'Deutsch (Standard)'),
              _buildLangOption(ctx, 'fr', '🇫🇷 Français', 'Français'),
              _buildLangOption(ctx, 'en', '🇬🇧 English', 'English'),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLangOption(BuildContext context, String lang, String title, String subtitle) {
    final isSelected = AppI18n.currentLocale.value == lang;
    return ListTile(
      title: Text(title, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
      trailing: isSelected ? const Icon(Icons.check_circle, color: Color(0xFF16A34A)) : null,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      tileColor: isSelected ? const Color(0xFFDCFCE7) : null,
      onTap: () {
        AppI18n.setLocale(lang);
        Navigator.pop(context);
      },
    );
  }
}
