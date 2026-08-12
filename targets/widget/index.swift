import WidgetKit
import SwiftUI

// MARK: - Données partagées (App Group écrit par l'app React Native)

enum Shared {
  static let suite = "group.com.matteo81.fil.widgets"
  static var defaults: UserDefaults? { UserDefaults(suiteName: suite) }
  static func str(_ key: String) -> String? {
    guard let v = defaults?.string(forKey: key), !v.isEmpty else { return nil }
    return v
  }
  static func int(_ key: String) -> Int { defaults?.integer(forKey: key) ?? 0 }
}

func parseDay(_ s: String?) -> Date? {
  guard let s = s else { return nil }
  let f = DateFormatter()
  f.calendar = Calendar(identifier: .gregorian)
  f.locale = Locale(identifier: "en_US_POSIX")
  f.timeZone = .current
  f.dateFormat = "yyyy-MM-dd"
  return f.date(from: s)
}

func daysBetween(_ from: Date, _ to: Date) -> Int {
  let cal = Calendar.current
  return cal.dateComponents([.day], from: cal.startOfDay(for: from), to: cal.startOfDay(for: to)).day ?? 0
}

// MARK: - Palette

extension Color {
  static let filEncre = Color(red: 0.106, green: 0.106, blue: 0.227)
  static let filPrune = Color(red: 0.290, green: 0.231, blue: 0.420)
  static let filAmbre = Color(red: 0.949, green: 0.651, blue: 0.353)
  static let filCorail = Color(red: 0.937, green: 0.549, blue: 0.486)
  static let filCreme = Color(red: 0.984, green: 0.965, blue: 0.937)
}

// MARK: - Timeline (une entrée par jour → se met à jour tout seul chaque jour)

struct DayEntry: TimelineEntry {
  let date: Date
}

struct FilProvider: TimelineProvider {
  func placeholder(in context: Context) -> DayEntry { DayEntry(date: Date()) }
  func getSnapshot(in context: Context, completion: @escaping (DayEntry) -> Void) {
    completion(DayEntry(date: Date()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<DayEntry>) -> Void) {
    let cal = Calendar.current
    let start = cal.startOfDay(for: Date())
    var entries: [DayEntry] = []
    for offset in 0..<14 {
      if let d = cal.date(byAdding: .day, value: offset, to: start) {
        entries.append(DayEntry(date: d))
      }
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

// MARK: - Widget « Compte à rebours »

struct CountdownView: View {
  var entry: DayEntry
  var body: some View {
    let label = Shared.str("reunion_label") ?? "Retrouvailles"
    let target = parseDay(Shared.str("reunion_date"))
    VStack(spacing: 4) {
      Text("💛 \(label)")
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(Color.filCreme.opacity(0.85))
        .lineLimit(1)
      if let target = target {
        let d = daysBetween(entry.date, target)
        if d > 0 {
          Text("\(d)")
            .font(.system(size: 44, weight: .bold, design: .rounded))
            .foregroundStyle(Color.filAmbre)
          Text(d == 1 ? "jour" : "jours")
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(Color.filCreme.opacity(0.8))
        } else if d == 0 {
          Text("C'est aujourd'hui !")
            .font(.system(size: 18, weight: .bold))
            .foregroundStyle(Color.filAmbre)
            .multilineTextAlignment(.center)
        } else {
          Text("💞")
            .font(.system(size: 40))
        }
      } else {
        Text("Ajoute une date dans Fil")
          .font(.system(size: 13))
          .foregroundStyle(Color.filCreme.opacity(0.7))
          .multilineTextAlignment(.center)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .containerBackground(for: .widget) {
      LinearGradient(colors: [Color.filPrune, Color.filEncre], startPoint: .top, endPoint: .bottom)
    }
  }
}

struct CountdownWidget: Widget {
  let kind = "FilCountdown"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FilProvider()) { entry in
      CountdownView(entry: entry)
    }
    .configurationDisplayName("Compte à rebours")
    .description("Les jours avant vos retrouvailles.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Widget « Jours ensemble »

struct TogetherView: View {
  var entry: DayEntry
  var body: some View {
    let since = parseDay(Shared.str("together_since"))
    let streak = Shared.int("streak")
    VStack(spacing: 4) {
      Text("💞 Ensemble depuis")
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(Color.filCreme.opacity(0.85))
        .lineLimit(1)
      if let since = since {
        let d = max(0, daysBetween(since, entry.date))
        Text("\(d)")
          .font(.system(size: 44, weight: .bold, design: .rounded))
          .foregroundStyle(Color.filCreme)
        Text(d == 1 ? "jour" : "jours")
          .font(.system(size: 14, weight: .medium))
          .foregroundStyle(Color.filCreme.opacity(0.8))
      } else {
        Text("Réglez votre date dans Fil")
          .font(.system(size: 13))
          .foregroundStyle(Color.filCreme.opacity(0.7))
          .multilineTextAlignment(.center)
      }
      if streak > 0 {
        Text("🔥 \(streak) j. d'affilée")
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(Color.filAmbre)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .containerBackground(for: .widget) {
      LinearGradient(colors: [Color.filCorail, Color.filPrune], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
  }
}

struct TogetherWidget: Widget {
  let kind = "FilTogether"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FilProvider()) { entry in
      TogetherView(entry: entry)
    }
    .configurationDisplayName("Jours ensemble")
    .description("Depuis combien de temps vous êtes ensemble, et votre série 🔥.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Bundle

@main
struct FilWidgets: WidgetBundle {
  var body: some Widget {
    CountdownWidget()
    TogetherWidget()
  }
}
