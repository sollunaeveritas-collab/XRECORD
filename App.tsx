import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import XRecordNative from "xrecord-native";

export default function App() {
  const [started, setStarted] = useState(false);
  const [hits, setHits] = useState(0);
  const [last, setLast] = useState("Ожидание запуска");
  const [sensitivity, setSensitivity] = useState("10");
  const [latency, setLatency] = useState<number | null>(null);
  const [overlay, setOverlay] = useState(false);
  const [coordX, setCoordX] = useState("540");
  const [coordY, setCoordY] = useState("1200");
  const [tapDelay, setTapDelay] = useState("0");

  const refreshPermissions = async () => {
    try { setOverlay(await XRecordNative.isOverlayAllowed()); } catch {}
  };

  useEffect(() => {
    refreshPermissions();
    const sub = XRecordNative.addDetectionListener((event: any) => {
      setHits(typeof event.count === "number" ? event.count : v => v + 1);
      setLatency(typeof event.latencyMs === "number" ? event.latencyMs : null);
      setLast(`Изменение • Δ ${event.difference} • ${event.tapSent ? "нажатие отправлено" : "нажатие не отправлено"} • ${event.latencyMs ?? "—"} мс`);
    });
    return () => sub.remove();
  }, []);

  const start = async () => {
    try {
      await refreshPermissions();
      const value = Math.max(1, Math.min(60, Number.parseInt(sensitivity, 10) || 10));
      await XRecordNative.setSensitivity(value);
      setSensitivity(String(value));
      if (!overlay) {
        await XRecordNative.requestOverlayPermission();
        Alert.alert("Разрешение", "Разрешите XRecord показываться поверх других приложений, вернитесь и нажмите ЗАПУСТИТЬ ещё раз.");
        return;
      }
      await XRecordNative.startMonitoring();
      setStarted(true);
      setLast("Захват запущен. Нажмите PLAY в плавающем окне.");
    } catch (e: any) {
      setLast("Ошибка запуска: " + (e?.message || "неизвестная ошибка"));
    }
  };

  const stop = async () => {
    try { await XRecordNative.stopMonitoring(); } catch {}
    setStarted(false);
    setLast("Мониторинг остановлен");
  };

  const updateSensitivity = (value: string) => setSensitivity(value.replace(/[^0-9]/g, "").slice(0, 2));

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.header}>
          <View style={s.logoBox}><Text style={s.logoX}>X</Text></View>
          <View><Text style={s.logo}>XRECORD</Text><Text style={s.sub}>SCREEN CHANGE MONITOR</Text></View>
          <View style={[s.dot,{backgroundColor:started?"#40D994":"#697386"}]}/>
        </View>

        <View style={s.hero}>
          <Text style={s.kicker}>МОНИТОРИНГ ЭКРАНА</Text>
          <Text style={s.title}>{started ? "Сессия запущена" : "Готов к запуску"}</Text>
          <Text style={s.description}>XRecord отслеживает изменения выбранной центральной области и показывает статистику. Автоматические нажатия отключены.</Text>
          <TouchableOpacity style={[s.mainButton,{backgroundColor:started?"#3A4352":"#E84950"}]} onPress={started?stop:start}>
            <Text style={s.mainButtonText}>{started?"ОСТАНОВИТЬ":"ЗАПУСТИТЬ"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.section}>РАЗРЕШЕНИЯ ANDROID</Text>
        <View style={s.card}>
          <View style={s.permissionRow}><Text style={s.label}>Показ поверх приложений</Text><Text style={[s.badge,{color:overlay?"#58D99A":"#FF8585"}]}>{overlay?"ВКЛЮЧЕНО":"НУЖНО ВКЛЮЧИТЬ"}</Text></View>
          <TouchableOpacity style={s.secondary} onPress={async()=>{await XRecordNative.requestOverlayPermission();setTimeout(refreshPermissions,800);}}>
            <Text style={s.secondaryText}>РАЗРЕШЕНИЕ ПЛАВАЮЩЕГО ОКНА</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.textButton} onPress={refreshPermissions}><Text style={s.textButtonText}>Обновить статус разрешений</Text></TouchableOpacity>
        </View>

        <Text style={s.section}>ЧУВСТВИТЕЛЬНОСТЬ</Text>
        <View style={s.card}>
          <Text style={s.description}>Порог средней разницы цвета между кадрами. Меньшее значение замечает более слабые изменения, но может увеличить число ложных срабатываний.</Text>
          <View style={s.coordRow}>
            <View style={s.coord}><Text style={s.label}>Порог (1–60)</Text><TextInput value={sensitivity} onChangeText={updateSensitivity} keyboardType="numeric" style={s.input}/></View>
            <TouchableOpacity style={s.apply} onPress={async()=>{const v=Math.max(1,Math.min(60,Number.parseInt(sensitivity,10)||10));setSensitivity(String(v));await XRecordNative.setSensitivity(v);setLast(`Чувствительность установлена: ${v}`);}}>
              <Text style={s.secondaryText}>ПРИМЕНИТЬ</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.note}>Рекомендуется начать с 8–12. Значение 1 максимально чувствительное и может реагировать на шум изображения.</Text>
        </View>

        <Text style={s.section}>АВТОМАТИЧЕСКОЕ НАЖАТИЕ</Text>
        <View style={s.card}>
          <Text style={s.description}>При обнаружении изменения XRecord отправляет касание по указанным координатам. Точка может находиться на пустом участке экрана.</Text>
          <View style={s.coordRow}>
            <View style={s.coord}><Text style={s.label}>X</Text><TextInput value={coordX} onChangeText={v=>setCoordX(v.replace(/[^0-9]/g,""))} keyboardType="numeric" style={s.input}/></View>
            <View style={s.coord}><Text style={s.label}>Y</Text><TextInput value={coordY} onChangeText={v=>setCoordY(v.replace(/[^0-9]/g,""))} keyboardType="numeric" style={s.input}/></View>
          </View>
          <View style={s.coordRow}>
            <View style={s.coord}><Text style={s.label}>Задержка перед нажатием (мс)</Text><TextInput value={tapDelay} onChangeText={v=>setTapDelay(v.replace(/[^0-9]/g,"").slice(0,4))} keyboardType="numeric" style={s.input}/></View>
            <TouchableOpacity style={s.apply} onPress={async()=>{const x=Math.max(0,Number.parseInt(coordX,10)||0),y=Math.max(0,Number.parseInt(coordY,10)||0),d=Math.max(0,Math.min(2000,Number.parseInt(tapDelay,10)||0));await XRecordNative.setTapPoint(x,y);await XRecordNative.setTapDelay(d);setCoordX(String(x));setCoordY(String(y));setTapDelay(String(d));setLast(`Точка сохранена: X ${x}, Y ${y}`);}}>
              <Text style={s.secondaryText}>СОХРАНИТЬ</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.secondary} onPress={async()=>{try{await XRecordNative.openPointPicker();}catch(e:any){Alert.alert("Выбор точки",e?.message||"Включите специальные возможности XRecord");}}}>
            <Text style={s.secondaryText}>ВЫБРАТЬ ТОЧКУ НА ЭКРАНЕ</Text>
          </TouchableOpacity>
          <Text style={s.note}>Для тестирования собственных приложений. Android может ограничивать жесты на отдельных системных или защищённых экранах.</Text>
        </View>

        <Text style={s.section}>СТАТИСТИКА</Text>
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{hits}</Text><Text style={s.statLabel}>ОБНАРУЖЕНИЙ</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{latency === null ? "—" : `${latency} мс`}</Text><Text style={s.statLabel}>ВРЕМЯ ОБРАБОТКИ</Text></View>
        </View>
        <View style={s.card}><Text style={s.label}>Последнее событие</Text><Text style={s.last}>{last}</Text></View>
        <Text style={s.footer}>XRECORD 2.5 • Локальный мониторинг • Без автоматических нажатий</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:"#090C12"},page:{padding:18,paddingBottom:42},
 header:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:22,marginTop:8},
 logoBox:{width:48,height:48,borderRadius:14,backgroundColor:"#E84950",alignItems:"center",justifyContent:"center"},
 logoX:{fontSize:30,fontWeight:"900",color:"#fff"},logo:{fontSize:22,fontWeight:"900",letterSpacing:2,color:"#fff"},
 sub:{fontSize:9,color:"#7F8A9C",letterSpacing:1.5,marginTop:3},dot:{marginLeft:"auto",width:10,height:10,borderRadius:10},
 hero:{backgroundColor:"#171D28",borderRadius:20,padding:19,borderWidth:1,borderColor:"#293241"},
 kicker:{fontSize:10,color:"#929EAF",fontWeight:"900",letterSpacing:1.4},title:{fontSize:23,color:"#fff",fontWeight:"900",marginTop:14},
 description:{fontSize:12,lineHeight:19,color:"#AAB4C2",marginTop:9},mainButton:{marginTop:20,padding:16,borderRadius:12,alignItems:"center"},
 mainButtonText:{fontSize:12,color:"#fff",fontWeight:"900",letterSpacing:1.2},
 section:{fontSize:10,color:"#8995A7",fontWeight:"900",letterSpacing:1.5,marginTop:24,marginBottom:10},
 card:{backgroundColor:"#151B25",borderRadius:16,borderWidth:1,borderColor:"#293241",padding:16},
 permissionRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingVertical:7},
 label:{fontSize:12,color:"#F0F3F7",fontWeight:"700"},badge:{fontSize:9,fontWeight:"900"},
 secondary:{backgroundColor:"#293241",padding:13,borderRadius:10,alignItems:"center",marginTop:10},
 secondaryText:{color:"#F2F4F7",fontSize:10,fontWeight:"900",letterSpacing:.6},
 textButton:{alignItems:"center",padding:10,marginTop:3},textButtonText:{color:"#9DAABD",fontSize:11},
 coordRow:{flexDirection:"row",gap:12,marginTop:14,alignItems:"flex-end"},coord:{flex:1},
 input:{marginTop:7,backgroundColor:"#252E3B",borderRadius:10,color:"#fff",paddingHorizontal:13,paddingVertical:11,fontSize:15},
 apply:{backgroundColor:"#293241",padding:15,borderRadius:10,alignItems:"center",justifyContent:"center",minHeight:48},
 note:{fontSize:10,color:"#8B97A9",lineHeight:16,marginTop:12},
 stats:{flexDirection:"row",gap:10},stat:{flex:1,backgroundColor:"#171D28",borderRadius:14,padding:16,borderWidth:1,borderColor:"#293241"},
 statNum:{fontSize:24,color:"#fff",fontWeight:"900"},statLabel:{fontSize:9,color:"#8995A7",fontWeight:"900",marginTop:7},
 last:{fontSize:12,color:"#F28B95",lineHeight:19,marginTop:10},footer:{textAlign:"center",fontSize:9,color:"#667386",marginTop:28}
});
