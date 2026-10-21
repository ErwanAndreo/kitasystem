import 'package:flutter_test/flutter_test.dart';
import 'package:kita_mobile/main.dart';

void main() {
  testWidgets('App loads successfully', (WidgetTester tester) async {
    await tester.pumpWidget(const KitaMitarbeiterApp());
    expect(find.byType(KitaMitarbeiterApp), findsOneWidget);
  });
}
