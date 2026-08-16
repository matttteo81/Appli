import WidgetKit
import SwiftUI
import UIKit

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

// MARK: - Timeline « à la minute » (pour l'heure du partenaire)

struct MinuteProvider: TimelineProvider {
  func placeholder(in context: Context) -> DayEntry { DayEntry(date: Date()) }
  func getSnapshot(in context: Context, completion: @escaping (DayEntry) -> Void) {
    completion(DayEntry(date: Date()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<DayEntry>) -> Void) {
    let cal = Calendar.current
    let now = Date()
    let start = cal.date(bySetting: .second, value: 0, of: now) ?? now
    var entries: [DayEntry] = []
    for m in 0..<60 {
      if let d = cal.date(byAdding: .minute, value: m, to: start) {
        entries.append(DayEntry(date: d))
      }
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

// MARK: - Widget « Partenaire » (heure locale + météo + ville)

struct PartnerView: View {
  var entry: DayEntry
  var body: some View {
    let name = Shared.str("partner_name") ?? "Ta moitié"
    let city = Shared.str("partner_city")
    let tzId = Shared.str("partner_timezone")
    let wEmoji = Shared.str("partner_weather_emoji")
    let temp = Shared.str("partner_temp")

    let timeStr: String = {
      let f = DateFormatter()
      f.dateFormat = "HH:mm"
      if let tzId = tzId, let tz = TimeZone(identifier: tzId) { f.timeZone = tz }
      return f.string(from: entry.date)
    }()

    VStack(spacing: 3) {
      Text(name)
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(Color.filCreme.opacity(0.9))
        .lineLimit(1)
      Text(timeStr)
        .font(.system(size: 40, weight: .bold, design: .rounded))
        .foregroundStyle(Color.filCreme)
      if let city = city {
        Text(city)
          .font(.system(size: 12))
          .foregroundStyle(Color.filCreme.opacity(0.8))
          .lineLimit(1)
      }
      if let wEmoji = wEmoji {
        Text("\(wEmoji) \(temp ?? "")°")
          .font(.system(size: 13, weight: .medium))
          .foregroundStyle(Color.filAmbre)
          .lineLimit(1)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .containerBackground(for: .widget) {
      LinearGradient(colors: [Color.filPrune, Color.filEncre], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
  }
}

struct PartnerWidget: Widget {
  let kind = "FilPartner"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MinuteProvider()) { entry in
      PartnerView(entry: entry)
    }
    .configurationDisplayName("Ta moitié")
    .description("L'heure locale, la météo et la ville de ta moitié.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Widget « Humeur du partenaire »

struct MoodView: View {
  var entry: DayEntry
  var body: some View {
    let name = Shared.str("partner_name") ?? "Ta moitié"
    let emoji = Shared.str("partner_mood_emoji") ?? "🌙"
    let label = Shared.str("partner_mood_label") ?? "En attente…"
    VStack(spacing: 6) {
      Text(emoji)
        .font(.system(size: 48))
      Text(label)
        .font(.system(size: 15, weight: .semibold))
        .foregroundStyle(Color.filEncre)
        .multilineTextAlignment(.center)
        .lineLimit(2)
      Text(name)
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(Color.filEncre.opacity(0.6))
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .containerBackground(for: .widget) {
      LinearGradient(colors: [Color.filCreme, Color(red: 0.953, green: 0.925, blue: 0.882)], startPoint: .top, endPoint: .bottom)
    }
  }
}

struct MoodWidget: Widget {
  let kind = "FilMood"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FilProvider()) { entry in
      MoodView(entry: entry)
    }
    .configurationDisplayName("Humeur de ta moitié")
    .description("L'humeur du moment de ta moitié.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Widget « Photos partagées »

struct PhotoView: View {
  var entry: DayEntry
  var body: some View {
    let b64 = Shared.str("photo_b64")
    ZStack {
      if let b64 = b64, let data = Data(base64Encoded: b64), let ui = UIImage(data: data) {
        Image(uiImage: ui)
          .resizable()
          .scaledToFill()
      } else {
        VStack(spacing: 6) {
          Text("📷").font(.system(size: 40))
          Text("Ajoutez une photo dans Fil")
            .font(.system(size: 12))
            .foregroundStyle(Color.filCreme.opacity(0.85))
            .multilineTextAlignment(.center)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .containerBackground(for: .widget) { Color.filEncre }
  }
}

struct PhotoWidget: Widget {
  let kind = "FilPhoto"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FilProvider()) { entry in
      PhotoView(entry: entry)
    }
    .configurationDisplayName("Photo partagée")
    .description("Votre dernière photo partagée.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

// MARK: - Widget « Dessin partagé » (traits vectoriels dessinés nativement)

struct WStroke: Decodable {
  let c: String
  let w: Double
  let p: [[Double]]
}

func parseStrokes(_ s: String?) -> [WStroke] {
  guard let s = s, let d = s.data(using: .utf8) else { return [] }
  return (try? JSONDecoder().decode([WStroke].self, from: d)) ?? []
}

func colorFromHex(_ hex: String) -> Color {
  var h = hex.trimmingCharacters(in: .whitespacesAndNewlines)
  if h.hasPrefix("#") { h.removeFirst() }
  guard h.count == 6, let v = UInt64(h, radix: 16) else { return .black }
  let r = Double((v & 0xFF0000) >> 16) / 255.0
  let g = Double((v & 0x00FF00) >> 8) / 255.0
  let b = Double(v & 0x0000FF) / 255.0
  return Color(red: r, green: g, blue: b)
}

struct DrawingView: View {
  var entry: DayEntry
  var body: some View {
    let strokes = parseStrokes(Shared.str("drawing_json"))
    ZStack {
      if strokes.isEmpty {
        VStack(spacing: 6) {
          Text("🎨").font(.system(size: 40))
          Text("Dessinez à deux dans Fil")
            .font(.system(size: 12))
            .foregroundStyle(Color.filEncre.opacity(0.6))
            .multilineTextAlignment(.center)
        }
      } else {
        Canvas { ctx, size in
          for st in strokes {
            var path = Path()
            for (i, pt) in st.p.enumerated() where pt.count >= 2 {
              let point = CGPoint(x: pt[0] * size.width, y: pt[1] * size.height)
              if i == 0 { path.move(to: point) } else { path.addLine(to: point) }
            }
            ctx.stroke(
              path,
              with: .color(colorFromHex(st.c)),
              style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round)
            )
          }
        }
        .padding(6)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .containerBackground(for: .widget) { Color.white }
  }
}

struct DrawingWidget: Widget {
  let kind = "FilDrawing"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FilProvider()) { entry in
      DrawingView(entry: entry)
    }
    .configurationDisplayName("Dessin partagé")
    .description("Votre dessin libre partagé.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Bundle

@main
struct FilWidgets: WidgetBundle {
  var body: some Widget {
    CountdownWidget()
    TogetherWidget()
    PartnerWidget()
    MoodWidget()
    PhotoWidget()
    DrawingWidget()
  }
}
