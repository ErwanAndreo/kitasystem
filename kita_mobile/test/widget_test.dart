import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:kita_mobile/main.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('de_DE', null);
  });

  group('KitaMitarbeiterApp Cross-Platform Test Suite (iOS, iPadOS, Android)', () {
    testWidgets('App loads and renders BottomNavigation with 5 tabs', (WidgetTester tester) async {
      await tester.pumpWidget(const KitaMitarbeiterApp());
      await tester.pumpAndSettle();

      expect(find.byType(KitaMitarbeiterApp), findsOneWidget);
      expect(find.byType(NavigationDestination), findsNWidgets(5));
    });

    testWidgets('Tab navigation switches between screens smoothly', (WidgetTester tester) async {
      await tester.pumpWidget(const KitaMitarbeiterApp());
      await tester.pumpAndSettle();

      // Tap on 2nd tab (Dienstplan)
      await tester.tap(find.byType(NavigationDestination).at(1));
      await tester.pumpAndSettle();
      expect(find.byType(Scaffold), findsWidgets);

      // Tap on 3rd tab (Checklisten)
      await tester.tap(find.byType(NavigationDestination).at(2));
      await tester.pumpAndSettle();
      expect(find.byType(Scaffold), findsWidgets);
      expect(find.text('Checklisten & Standards'), findsOneWidget);

      // Tap on 4th tab (Anträge)
      await tester.tap(find.byType(NavigationDestination).at(3));
      await tester.pumpAndSettle();
      expect(find.byType(Scaffold), findsWidgets);

      // Tap on 5th tab (Pinnwand)
      await tester.tap(find.byType(NavigationDestination).at(4));
      await tester.pumpAndSettle();
      expect(find.byType(Scaffold), findsWidgets);

      // Tap back to 1st tab (Heute)
      await tester.tap(find.byType(NavigationDestination).at(0));
      await tester.pumpAndSettle();
      expect(find.byType(Scaffold), findsWidgets);
    });

    testWidgets('ChecklistsScreen renders list and allows creating new checklist', (WidgetTester tester) async {
      await tester.pumpWidget(const KitaMitarbeiterApp());
      await tester.pumpAndSettle();

      // Navigate to Checklisten tab (index 2)
      await tester.tap(find.byType(NavigationDestination).at(2));
      await tester.pumpAndSettle();

      expect(find.text('Checklisten & Standards'), findsOneWidget);
      expect(find.text('Neue Liste'), findsOneWidget);

      // Tap on Neue Liste FAB
      await tester.tap(find.text('Neue Liste'));
      await tester.pumpAndSettle();

      expect(find.text('Neue Checkliste anlegen'), findsOneWidget);
      expect(find.text('Schließdienst'), findsOneWidget);
      expect(find.text('Morgenroutine'), findsOneWidget);
    });

    testWidgets('RequestsScreen renders actions and opens Wunschdienst modal', (WidgetTester tester) async {
      await tester.pumpWidget(const KitaMitarbeiterApp());
      await tester.pumpAndSettle();

      // Navigate to Anträge tab (index 3)
      await tester.tap(find.byType(NavigationDestination).at(3));
      await tester.pumpAndSettle();

      expect(find.text('Tausch & Anträge'), findsOneWidget);
      expect(find.text('Wunschdienst\nhinterlegen'), findsOneWidget);
      expect(find.text('Schicht\ntauschen'), findsOneWidget);
      expect(find.text('Urlaub\nbeantragen'), findsOneWidget);
      expect(find.text('Krank-\nmeldung'), findsOneWidget);

      // Open Wunschdienst bottom sheet
      await tester.tap(find.text('Wunschdienst\nhinterlegen'));
      await tester.pumpAndSettle();

      expect(find.text('Schichtwunsch einreichen'), findsOneWidget);
      expect(find.text('Wunschdienst einreichen'), findsOneWidget);

      // Close bottom sheet
      Navigator.of(tester.element(find.text('Schichtwunsch einreichen'))).pop();
      await tester.pumpAndSettle();
    });

    testWidgets('RequestsScreen opens Schichttausch modal without RenderFlex overflow', (WidgetTester tester) async {
      // Set a narrow mobile screen size (360x740)
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(const KitaMitarbeiterApp());
      await tester.pumpAndSettle();

      // Navigate to Anträge tab (index 3)
      await tester.tap(find.byType(NavigationDestination).at(3));
      await tester.pumpAndSettle();

      // Tap on 'Schicht tauschen'
      await tester.tap(find.text('Schicht\ntauschen'));
      await tester.pumpAndSettle();

      expect(find.text('Schichttausch anfragen'), findsOneWidget);
      expect(find.text('Wen möchtest du um Übernahme bitten?'), findsOneWidget);
      expect(find.text('Tausch anfragen'), findsOneWidget);

      // Verify no exceptions or overflows occurred
      expect(tester.takeException(), isNull);

      // Close bottom sheet
      Navigator.of(tester.element(find.text('Schichttausch anfragen'))).pop();
      await tester.pumpAndSettle();

      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    testWidgets('Language switcher toggles between Deutsch, Français and English', (WidgetTester tester) async {
      await tester.pumpWidget(const KitaMitarbeiterApp());
      await tester.pumpAndSettle();

      // Check default German labels
      expect(find.text('Heute'), findsOneWidget);
      expect(find.text('Dienstplan'), findsOneWidget);
      expect(find.text('Checklisten'), findsOneWidget);

      // Open Language Selector
      await tester.tap(find.byIcon(Icons.language));
      await tester.pumpAndSettle();

      // Select Français
      await tester.tap(find.text('🇫🇷 Français'));
      await tester.pumpAndSettle();

      expect(find.text('Aujourd\'hui'), findsOneWidget);
      expect(find.text('Planning'), findsOneWidget);
      expect(find.text('Listes'), findsOneWidget);

      // Open Language Selector and select English
      await tester.tap(find.byIcon(Icons.language));
      await tester.pumpAndSettle();

      await tester.tap(find.text('🇬🇧 English'));
      await tester.pumpAndSettle();

      expect(find.text('Today'), findsOneWidget);
      expect(find.text('Roster'), findsOneWidget);
      expect(find.text('Checklists'), findsOneWidget);

      // Switch back to Deutsch
      await tester.tap(find.byIcon(Icons.language));
      await tester.pumpAndSettle();

      await tester.tap(find.text('🇩🇪 Deutsch'));
      await tester.pumpAndSettle();

      expect(find.text('Heute'), findsOneWidget);
      expect(find.text('Dienstplan'), findsOneWidget);
    });

    testWidgets('iPadOS & Tablet responsive layout test (large viewport 1024x768)', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1024, 768);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(const KitaMitarbeiterApp());
      await tester.pumpAndSettle();

      expect(find.byType(KitaMitarbeiterApp), findsOneWidget);
      expect(find.byType(NavigationDestination), findsNWidgets(5));

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });
}
