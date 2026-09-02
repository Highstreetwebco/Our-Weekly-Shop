import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { meals, starterPlan, starterShop } from "@/lib/demo-data";
import { Meal, PlanItem, ShopItem } from "@/lib/types";

type Tab = "Home" | "My Week" | "Shop" | "At Home" | "More";
export default function App() {
  const [tab, setTab] = useState<Tab>("Home");
  const [plan, setPlan] = useState<PlanItem[]>(starterPlan);
  const [shop, setShop] = useState<ShopItem[]>(starterShop);
  const [adding, setAdding] = useState("");
  const markCooked = (id: string) =>
    setPlan((items) =>
      items.map((item) => (item.id === id ? { ...item, cooked: true } : item)),
    );
  const addItem = () => {
    const name = adding.trim();
    if (!name) return;
    setShop((items) => [
      ...items,
      {
        id: Date.now().toString(),
        name,
        detail: "Added by you",
        category: "Extras",
      },
    ]);
    setAdding("");
  };
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === "Home" && (
          <Home plan={plan} onCook={markCooked} setTab={setTab} />
        )}
        {tab === "My Week" && <Week plan={plan} setPlan={setPlan} />}
        {tab === "Shop" && (
          <Shop
            items={shop}
            setItems={setShop}
            adding={adding}
            setAdding={setAdding}
            onAdd={addItem}
          />
        )}
        {tab === "At Home" && <AtHome setTab={setTab} />}
        {tab === "More" && <More />}
      </ScrollView>
      <Nav tab={tab} setTab={setTab} />
    </SafeAreaView>
  );
}
function Header({ title, kicker }: { title: string; kicker?: string }) {
  return (
    <View style={s.header}>
      {kicker && <Text style={s.kicker}>{kicker}</Text>}
      <Text style={s.title}>{title}</Text>
    </View>
  );
}
function Home({
  plan,
  onCook,
  setTab,
}: {
  plan: PlanItem[];
  onCook: (id: string) => void;
  setTab: (tab: Tab) => void;
}) {
  const tonight = plan.find((p) => !p.cooked) || plan[0];
  return (
    <>
      <Header kicker="GOOD EVENING, JACK" title="Your weekly shop, sorted." />
      <View style={s.hero}>
        <View>
          <Text style={s.eyebrow}>TONIGHT</Text>
          <Text style={s.heroTitle}>{tonight.name}</Text>
          <Text style={s.heroSub}>
            Feeds {tonight.portions} · Chicken expires tomorrow
          </Text>
        </View>
        <TouchableOpacity
          style={s.lightButton}
          onPress={() => onCook(tonight.id)}
        >
          <Ionicons name="checkmark" size={18} color={theme.green} />
          <Text style={s.lightText}>Cooked</Text>
        </TouchableOpacity>
      </View>
      <Section
        title="Use first"
        action="See all"
        onPress={() => setTab("At Home")}
      />
      <View style={s.row}>
        <Expiry icon="nutrition-outline" name="Chicken breasts" when="Tomorrow" urgent />
        <Expiry icon="water-outline" name="Milk" when="2 days" />
        <Expiry icon="restaurant-outline" name="Sour cream" when="3 days" />
      </View>
      <Section
        title="Your week"
        action="Plan meals"
        onPress={() => setTab("My Week")}
      />
      <View style={s.card}>
        {plan.slice(0, 3).map((p, i) => (
          <View key={p.id} style={[s.listRow, i < 2 && s.border]}>
            <Text style={s.day}>{p.day}</Text>
            <View style={s.mealIcon}><Ionicons name="restaurant-outline" size={17} color={theme.green} /></View>
            <View style={s.grow}>
              <Text style={[s.itemName, p.cooked && s.done]}>{p.name}</Text>
              <Text style={s.itemDetail}>
                {p.cooked ? "Cooked ✓" : `Feeds ${p.portions}`}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Section title="Next shop" />
      <View style={s.nextShop}>
        <View style={s.circle}>
          <Ionicons name="cart-outline" size={25} color={theme.green} />
        </View>
        <View style={s.grow}>
          <Text style={s.itemName}>Ready when you are</Text>
          <Text style={s.itemDetail}>7 regular items are likely due</Text>
        </View>
        <TouchableOpacity style={s.greenButton} onPress={() => setTab("Shop")}>
          <Text style={s.greenText}>Review</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
function Week({
  plan,
  setPlan,
}: {
  plan: PlanItem[];
  setPlan: (p: PlanItem[]) => void;
}) {
  const toggle = (id: string) =>
    setPlan(plan.map((p) => (p.id === id ? { ...p, cooked: !p.cooked } : p)));
  return (
    <>
      <Header kicker="PLAN MY WEEK" title="Meals made easy." />
      <Text style={s.intro}>
        You’ve got {plan.filter((p) => !p.cooked).length} dinners left to enjoy
        this week.
      </Text>
      <View style={s.card}>
        {plan.map((p, i) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => toggle(p.id)}
            style={[s.mealRow, i < plan.length - 1 && s.border]}
          >
            <View style={[s.check, p.cooked && s.checkOn]}>
              {p.cooked && (
                <Ionicons name="checkmark" size={15} color="white" />
              )}
            </View>
            <Text style={s.day}>{p.day}</Text>
            <View style={s.mealIcon}><Ionicons name="restaurant-outline" size={17} color={theme.green} /></View>
            <View style={s.grow}>
              <Text style={[s.itemName, p.cooked && s.done]}>{p.name}</Text>
              <Text style={s.itemDetail}>
                {p.portions} portions ·{" "}
                {p.cooked ? "Cooked" : "Tap when cooked"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </TouchableOpacity>
        ))}
      </View>
      <Section title="Ideas for next week" />
      <Text style={s.intro}>You haven’t had these recently.</Text>
      <View style={s.chips}>
        {meals.slice(0, 3).map((m) => (
          <View key={m.id} style={s.chip}>
            <Ionicons name="restaurant-outline" size={18} color={theme.green} />
            <Text style={s.chipText}>{m.name}</Text>
          </View>
        ))}
      </View>
    </>
  );
}
function Shop({
  items,
  setItems,
  adding,
  setAdding,
  onAdd,
}: {
  items: ShopItem[];
  setItems: (p: ShopItem[]) => void;
  adding: string;
  setAdding: (x: string) => void;
  onAdd: () => void;
}) {
  const categories = ["Meals", "Regulars", "Extras"] as const;
  const checked = items.filter((i) => i.checked).length;
  return (
    <>
      <Header kicker="THIS WEEK'S SHOP" title="A simpler shop." />
      <View style={s.summary}>
        <Text style={s.summaryBig}>{items.length - checked} items</Text>
        <Text style={s.summarySmall}>
          {checked
            ? `${checked} already sorted`
            : "Everything you need, in one place"}
        </Text>
      </View>
      <View style={s.addBar}>
        <Ionicons name="add-circle-outline" size={22} color={theme.green} />
        <TextInput
          value={adding}
          onChangeText={setAdding}
          onSubmitEditing={onAdd}
          placeholder="Add anything… batteries, toothpaste"
          placeholderTextColor={theme.muted}
          style={s.input}
        />
        <TouchableOpacity onPress={onAdd}>
          <Text style={s.addText}>Add</Text>
        </TouchableOpacity>
      </View>
      {categories.map((category) => {
        const group = items.filter((i) => i.category === category);
        return group.length ? (
          <View key={category}>
            <Text style={s.group}>{category}</Text>
            <View style={s.card}>
              {group.map((item, i) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    setItems(
                      items.map((x) =>
                        x.id === item.id ? { ...x, checked: !x.checked } : x,
                      ),
                    )
                  }
                  style={[s.shopRow, i < group.length - 1 && s.border]}
                >
                  <View style={[s.check, item.checked && s.checkOn]}>
                    {item.checked && (
                      <Ionicons name="checkmark" size={15} color="white" />
                    )}
                  </View>
                  <View style={s.grow}>
                    <Text style={[s.itemName, item.checked && s.done]}>
                      {item.name}
                    </Text>
                    <Text style={s.itemDetail}>{item.detail}</Text>
                  </View>
                  {item.due && (
                    <View style={s.due}>
                      <Text style={s.dueText}>DUE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null;
      })}
      <TouchableOpacity style={s.compare}>
        <Ionicons name="stats-chart-outline" size={20} color="white" />
        <View>
          <Text style={s.compareTitle}>Compare supermarkets</Text>
          <Text style={s.compareSub}>
            Coming next — we’ll find your best shop
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="white" />
      </TouchableOpacity>
    </>
  );
}
function AtHome({ setTab }: { setTab: (tab: Tab) => void }) {
  return (
    <>
      <Header kicker="AT HOME" title="Use it before you lose it." />
      <View style={s.card}>
        <Expiry
          icon="nutrition-outline"
          name="Chicken breasts"
          when="Use tomorrow"
          urgent
          big
        />
        <Expiry icon="water-outline" name="Milk" when="Use in 2 days" big />
        <Expiry icon="restaurant-outline" name="Sour cream" when="Use in 3 days" big />
      </View>
      <View style={s.tip}>
        <Ionicons name="bulb-outline" size={24} color={theme.amber} />
        <View style={s.grow}>
          <Text style={s.itemName}>A good idea for tonight</Text>
          <Text style={s.itemDetail}>
            Burritos use your chicken and sour cream.
          </Text>
          <TouchableOpacity onPress={() => setTab("My Week")}>
            <Text style={s.link}>Move Burritos to tonight</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Section title="How this works" />
      <Text style={s.intro}>
        We make sensible stock assumptions. Marking a meal cooked updates what
        we think you have, without making you count every cupboard item.
      </Text>
    </>
  );
}
function More() {
  return (
    <>
      <Header kicker="YOUR HOUSEHOLD" title="The Troth Household" />
      <View style={s.card}>
        {[
          ["person-outline", "Household members", "You and Gemma"],
          ["restaurant-outline", "My meals", "6 saved dinners"],
          ["repeat-outline", "My regulars", "We’ll learn what runs out"],
          ["storefront-outline", "Supermarkets", "Choose where we compare"],
          ["settings-outline", "Settings", "Preferences and account"],
        ].map((row, i) => (
          <TouchableOpacity
            key={row[1]}
            style={[s.settingsRow, i < 4 && s.border]}
          >
            <View style={s.settingIcon}>
              <Ionicons name={row[0] as any} size={20} color={theme.green} />
            </View>
            <View style={s.grow}>
              <Text style={s.itemName}>{row[1]}</Text>
              <Text style={s.itemDetail}>{row[2]}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.footnote}>
        Our Weekly Shop learns gently over time. You always stay in control.
      </Text>
    </>
  );
}
function Expiry({
  icon,
  name,
  when,
  urgent,
  big,
}: {
  icon: any;
  name: string;
  when: string;
  urgent?: boolean;
  big?: boolean;
}) {
  return (
    <View style={big ? s.expiryBig : s.expiry}>
      <View style={s.productIcon}><Ionicons name={icon} size={19} color={theme.green} /></View>
      <View style={s.grow}>
        <Text style={s.expiryName}>{name}</Text>
        <Text style={[s.expiryWhen, urgent && { color: theme.red }]}>
          {when}
        </Text>
      </View>
    </View>
  );
}
function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onPress}>
          <Text style={s.link}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
function Nav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items: [Tab, string, any][] = [
    ["Home", "home-outline", "home"],
    ["My Week", "calendar-outline", "calendar"],
    ["Shop", "cart-outline", "cart"],
    ["At Home", "leaf-outline", "leaf"],
    ["More", "ellipsis-horizontal", "ellipsis-horizontal"],
  ];
  return (
    <View style={s.nav}>
      {items.map(([name, outline, solid]) => (
        <TouchableOpacity
          key={name}
          style={s.navItem}
          onPress={() => setTab(name)}
        >
          <Ionicons
            name={(tab === name ? solid : outline) as any}
            size={22}
            color={tab === name ? theme.green : theme.muted}
          />
          <Text style={[s.navText, tab === name && s.navTextOn]}>{name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.cream },
  content: { padding: 20, paddingBottom: 108 },
  header: { paddingTop: 18, paddingBottom: 24 },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: "700",
    color: theme.green,
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    color: theme.ink,
    letterSpacing: -0.7,
  },
  hero: {
    backgroundColor: theme.green,
    borderRadius: 16,
    padding: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#D6EFDE",
  },
  heroTitle: { fontSize: 23, fontWeight: "700", color: "white", marginTop: 8 },
  heroSub: { fontSize: 13, color: "#D6EFDE", marginTop: 5 },
  lightButton: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 3,
  },
  lightText: { fontWeight: "700", fontSize: 12, color: theme.green },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 11,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: theme.ink },
  link: { fontSize: 13, fontWeight: "700", color: theme.green },
  row: { flexDirection: "row", gap: 9, marginBottom: 27 },
  expiry: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 12,
    flex: 1,
    alignItems: "center",
    minHeight: 104,
  },
  productIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.greenSoft, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  expiryName: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.ink,
    textAlign: "center",
  },
  expiryWhen: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.amber,
    marginTop: 3,
    textAlign: "center",
  },
  card: {
    backgroundColor: theme.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.line,
    overflow: "hidden",
    marginBottom: 26,
  },
  listRow: { flexDirection: "row", alignItems: "center", padding: 15 },
  mealRow: { flexDirection: "row", alignItems: "center", padding: 15 },
  border: { borderBottomWidth: 1, borderBottomColor: theme.line },
  day: { width: 32, fontSize: 12, fontWeight: "800", color: theme.muted },
  mealIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: theme.greenSoft, alignItems: "center", justifyContent: "center", marginRight: 11 },
  grow: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "700", color: theme.ink },
  itemDetail: { fontSize: 12, color: theme.muted, marginTop: 3 },
  done: { textDecorationLine: "line-through", color: theme.muted },
  nextShop: {
    backgroundColor: theme.sand,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circle: {
    height: 48,
    width: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  greenButton: {
    backgroundColor: theme.green,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 9,
  },
  greenText: { color: "white", fontWeight: "700", fontSize: 13 },
  intro: { fontSize: 15, lineHeight: 22, color: theme.muted, marginBottom: 20 },
  check: {
    height: 22,
    width: 22,
    borderWidth: 1.5,
    borderColor: "#CCD6CE",
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  checkOn: { backgroundColor: theme.green, borderColor: theme.green },
  chips: { flexDirection: "row", gap: 8, marginBottom: 20 },
  chip: {
    flex: 1,
    backgroundColor: theme.white,
    borderRadius: 11,
    padding: 11,
    gap: 5,
  },
  chipText: { fontSize: 11, fontWeight: "600", color: theme.ink },
  summary: {
    backgroundColor: theme.greenSoft,
    borderRadius: 12,
    padding: 17,
    marginBottom: 13,
  },
  summaryBig: { fontSize: 21, fontWeight: "700", color: theme.green },
  summarySmall: { fontSize: 13, color: theme.green, marginTop: 3 },
  addBar: {
    backgroundColor: theme.white,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 14,
    color: theme.ink,
    paddingHorizontal: 9,
  },
  addText: { fontSize: 14, fontWeight: "700", color: theme.green },
  group: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    color: theme.muted,
    marginBottom: 8,
  },
  shopRow: { flexDirection: "row", alignItems: "center", padding: 15 },
  due: {
    backgroundColor: "#FFF0D6",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  dueText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#98620F",
  },
  compare: {
    borderRadius: 14,
    backgroundColor: theme.green,
    padding: 17,
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
  },
  compareTitle: { fontSize: 16, fontWeight: "700", color: "white" },
  compareSub: { fontSize: 11, color: "#D6EFDE", marginTop: 3 },
  expiryBig: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  tip: {
    backgroundColor: "#FFF7E8",
    borderRadius: 12,
    padding: 17,
    flexDirection: "row",
    gap: 12,
    marginBottom: 26,
  },
  settingsRow: {
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingIcon: {
    height: 39,
    width: 39,
    borderRadius: 10,
    backgroundColor: theme.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  footnote: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.muted,
    textAlign: "center",
    paddingHorizontal: 25,
  },
  nav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.white,
    borderTopWidth: 1,
    borderColor: theme.line,
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 12,
  },
  navItem: { flex: 1, alignItems: "center", gap: 3 },
  navText: { fontSize: 10, color: theme.muted, fontWeight: "600" },
  navTextOn: { color: theme.green, fontWeight: "800" },
});
