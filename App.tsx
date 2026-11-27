import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import XRecordNative from "xrecord-native";

export default function App() {
  const [started, setStarted] = useState(false);
  const [hits, setHits] = useState(0);
  const [last, setLast] = useState("Ожидание запуска");
  const [x, setX] = useState("540");
  const [y, setY] = useState("1200");
  const [accessibility, setAccessibility] = useState(false);
  const [overlay, setOverlay] = useState(false);

  const refreshPermissions = async () => {
    try {
      setOverlay(await XRecordNative.isOverlayAllowed());
      setAccessibility(await XRecordNative.isAccessibilityEnabled());
    } catch {}
  };

  useEffect(() => {
    refreshPermissions();
    const sub = XRecordNative.addDetectionListener((event: any) => {
      setHits(typeof event.count === "number" ? event.count : (v => v + 1));
      setLast(`Изменение обнаружено • Δ ${event.difference} • ${event.tapSent ? "нажатие отправлено" : "нажатие не выполнено — проверьте Accessibility и координаты"}`);
    });
    const pointSub = XRecordNative.addPointSelectedListener((point: any) => {
      setX(String(point.x));
      setY(String(point.y));
      setLast(`Точка нажатия сохранена • X: ${point.x}, Y: ${point.y}`);
    });
    return () => { sub.remove(); pointSub.remove(); };
  }, []);

  const start = async () => {
    try {
      await refreshPermissions();
      if (!overlay) {
        await XRecordNative.requestOverlayPermission();
        Alert.alert("Разрешение", "Разрешите XRecord показываться поверх других приложений, вернитесь и нажмите ЗАПУСТИТЬ ещё раз.");
        return;
      }
      if (!accessibility) {
        Alert.alert("Нужно разрешение на нажатия", "Включите XRecord в настройках специальных возможностей Android. Затем вернитесь и нажмите ЗАПУСТИТЬ.");
        await XRecordNative.openAccessibilitySettings();
        return;
      }
      await XRecordNative.setTapPoint(Number(x) || 0, Number(y) || 0);
      await XRecordNative.startMonitoring();
      setStarted(true);
      setLast("Захват запущен. На плавающем окне нажмите PLAY.");
    } catch (e: any) {
      setLast("Ошибка запуска: " + (e?.message || "неизвестная ошибка"));
    }
  };

  const stop = async () => {
    try { await XRecordNative.stopMonitoring(); } catch {}
    setStarted(false);
    setLast("Мониторинг остановлен");
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.header}>
          <View style={s.logoBox}><Text style={s.logoX}>X</Text></View>
          <View><Text style={s.logo}>XRECORD</Text><Text style={s.sub}>SCREEN CHANGE TRIGGER</Text></View>
          <View style={[s.dot,{backgroundColor:started?"#40D994":"#697386"}]}/>
        </View>

        <View style={s.hero}>
          <Text style={s.kicker}>УПРАВЛЕНИЕ МОНИТОРИНГОМ</Text>
          <Text style={s.title}>{started ? "Сессия запущена" : "Готов к запуску"}</Text>
          <Text style={s.description}>После запуска появится плавающее окно. В нём PLAY включает обнаружение и тестовое нажатие, PAUSE останавливает их.</Text>
          <TouchableOpacity style={[s.mainButton,{backgroundColor:started?"#3A4352":"#E84950"}]} onPress={started?stop:start}>
            <Text style={s.mainButtonText}>{started?"ОСТАНОВИТЬ":"ЗАПУСТИТЬ"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.section}>РАЗРЕШЕНИЯ ANDROID</Text>
        <View style={s.card}>
          <View style={s.permissionRow}><Text style={s.label}>Показ поверх приложений</Text><Text style={[s.badge,{color:overlay?"#58D99A":"#FF8585"}]}>{overlay?"ВКЛЮЧЕНО":"НУЖНО ВКЛЮЧИТЬ"}</Text></View>
          <View style={s.permissionRow}><Text style={s.label}>Специальные возможности</Text><Text style={[s.badge,{color:accessibility?"#58D99A":"#FF8585"}]}>{accessibility?"ВКЛЮЧЕНО":"НУЖНО ВКЛЮЧИТЬ"}</Text></View>
          <TouchableOpacity style={s.secondary} onPress={async()=>{await XRecordNative.requestOverlayPermission();setTimeout(refreshPermissions,800);}}>
            <Text style={s.secondaryText}>РАЗРЕШЕНИЕ ПЛАВАЮЩЕГО ОКНА</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondary} onPress={async()=>{await XRecordNative.openAccessibilitySettings();}}>
            <Text style={s.secondaryText}>НАСТРОЙКИ СПЕЦИАЛЬНЫХ ВОЗМОЖНОСТЕЙ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.textButton} onPress={refreshPermissions}><Text style={s.textButtonText}>Обновить статус разрешений</Text></TouchableOpacity>
        </View>

        <Text style={s.section}>КООРДИНАТЫ ТЕСТОВОГО НАЖАТИЯ</Text>
        <View style={s.card}>
          <Text style={s.description}>Укажите координаты кнопки на экране в физических пикселях (X слева направо, Y сверху вниз). Начальное значение нужно подобрать под разрешение устройства.</Text>
          <TouchableOpacity style={s.pickButton} onPress={async () => {
            try {
              await XRecordNative.openPointPicker();
              setLast("Переместите красный прицел на нужную кнопку и нажмите СОХРАНИТЬ.");
            } catch (e: any) {
              Alert.alert("Не удалось открыть выбор точки", e?.message || "Проверьте разрешение специальных возможностей.");
            }
          }}>
            <Text style={s.pickButtonText}>⌖  ВЫБРАТЬ КНОПКУ НА ЭКРАНЕ</Text>
          </TouchableOpacity>
          <View style={s.coordRow}>
            <View style={s.coord}><Text style={s.label}>X</Text><TextInput value={x} onChangeText={setX} keyboardType="numeric" style={s.input}/></View>
            <View style={s.coord}><Text style={s.label}>Y</Text><TextInput value={y} onChangeText={setY} keyboardType="numeric" style={s.input}/></View>
          </View>
          <Text style={s.note}>Автонажатие доступно только после явного включения XRecord в специальных возможностях Android. PLAY фиксирует первое приложение, открытое после XRecord, и ограничивает нажатия этим приложением до PAUSE.</Text>
        </View>

        <Text style={s.section}>СОБЫТИЯ</Text>
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{hits}</Text><Text style={s.statLabel}>ОБНАРУЖЕНИЙ</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{started?"ON":"OFF"}</Text><Text style={s.statLabel}>СЕССИЯ</Text></View>
        </View>
        <View style={s.card}><Text style={s.label}>Последнее событие</Text><Text style={s.last}>{last}</Text></View>
        <Text style={s.footer}>XRECORD 2.2 • Обработка изображения локально на устройстве</Text>
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
 pickButton:{backgroundColor:"#E84950",padding:15,borderRadius:11,alignItems:"center",marginTop:15},
 pickButtonText:{color:"#fff",fontSize:11,fontWeight:"900",letterSpacing:.5},
 secondaryText:{color:"#F2F4F7",fontSize:10,fontWeight:"900",letterSpacing:.6},
 textButton:{alignItems:"center",padding:10,marginTop:3},textButtonText:{color:"#9DAABD",fontSize:11},
 coordRow:{flexDirection:"row",gap:12,marginTop:14},coord:{flex:1},
 input:{marginTop:7,backgroundColor:"#252E3B",borderRadius:10,color:"#fff",paddingHorizontal:13,paddingVertical:11,fontSize:15},
 note:{fontSize:10,color:"#8B97A9",lineHeight:16,marginTop:12},
 stats:{flexDirection:"row",gap:10},stat:{flex:1,backgroundColor:"#171D28",borderRadius:14,padding:16,borderWidth:1,borderColor:"#293241"},
 statNum:{fontSize:24,color:"#fff",fontWeight:"900"},statLabel:{fontSize:9,color:"#8995A7",fontWeight:"900",marginTop:5,letterSpacing:1},
 last:{fontSize:12,color:"#FF999D",lineHeight:18,marginTop:8},footer:{fontSize:9,color:"#687487",textAlign:"center",marginTop:26}
});
