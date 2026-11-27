import React,{useEffect,useRef,useState} from "react";
import {SafeAreaView,View,Text,TouchableOpacity,StyleSheet,ScrollView,Switch} from "react-native";
import {StatusBar} from "expo-status-bar";
import XRecordNative from "xrecord-native";

const RED="#F04444";
type Target="TEST BUTTON A"|"TEST BUTTON B"|"TEST BUTTON C";
export default function App(){
 const [running,setRunning]=useState(false);
 const [sensitivity,setSensitivity]=useState(35);
 const [zone,setZone]=useState(12);
 const [delay,setDelay]=useState(100);
 const [target,setTarget]=useState<Target>("TEST BUTTON A");
 const [cooldown,setCooldown]=useState(true);
 const [sample,setSample]=useState(false);
 const [hits,setHits]=useState(0);
 const [presses,setPresses]=useState(0);
 const [last,setLast]=useState("Ожидание тестового события");
 const [history,setHistory]=useState<string[]>([]);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const locked=useRef(false);

 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const addLog=(v:string)=>setHistory(h=>[`${new Date().toLocaleTimeString()} — ${v}`,...h].slice(0,8));
 const trigger=()=>{
   if(!running || (cooldown && locked.current)) return;
   locked.current=true; setHits(v=>v+1); setLast("Обнаружено изменение тестового образца"); addLog("Обнаружено изменение");
   if(timer.current)clearTimeout(timer.current);
   timer.current=setTimeout(()=>{
     setPresses(v=>v+1); setLast(`Тестовое нажатие: ${target}`); addLog(`Выполнено тестовое нажатие ${target}`);
     if(cooldown) setTimeout(()=>{locked.current=false},450);
     else locked.current=false;
   },delay);
 };
 const toggle=async()=>{locked.current=false;
   if(running){try{await XRecordNative.stopMonitoring();}catch(e){} setRunning(false);setLast("Мониторинг остановлен");return;}
   try{const allowed=await XRecordNative.isOverlayAllowed();if(!allowed){await XRecordNative.requestOverlayPermission();setLast("Разрешите показ поверх других приложений, затем нажмите запуск снова");return;}
   await XRecordNative.startMonitoring();setRunning(true);setLast("Захват экрана запущен");}
   catch(e){setLast("Не удалось запустить: проверьте разрешения Android");}
  };
 const step=(v:number,fn:(n:number)=>void,min:number,max:number)=>fn(Math.max(min,Math.min(max,v)));
 return <SafeAreaView style={s.root}><StatusBar style="light"/><ScrollView contentContainerStyle={s.page}>
  <View style={s.header}><View style={s.mark}><Text style={s.markText}>X</Text></View><View><Text style={s.logo}>XRECORD</Text><Text style={s.tag}>VISUAL TRIGGER LAB</Text></View><View style={s.beta}><Text style={s.betaText}>TEST BUILD</Text></View></View>
  <View style={s.statusCard}><View style={s.row}><Text style={s.eyebrow}>ТЕСТОВАЯ СЕССИЯ</Text><View style={[s.pill,{backgroundColor:running?"#173C2E":"#303541"}]}><Text style={{color:running?"#62E6A1":"#AAB1BD",fontSize:10,fontWeight:"900"}}>{running?"ACTIVE":"STOPPED"}</Text></View></View>
   <Text style={s.statusTitle}>{running?"Система готова к тесту":"Мониторинг остановлен"}</Text><Text style={s.muted}>Триггер и нажатия ниже работают только внутри тестового стенда XRecord.</Text>
   <TouchableOpacity style={[s.primary,{backgroundColor:running?"#343B48":RED}]} onPress={toggle}><Text style={s.primaryText}>{running?"ОСТАНОВИТЬ ТЕСТ":"ЗАПУСТИТЬ ТЕСТ"}</Text></TouchableOpacity>
  </View>
  <Text style={s.section}>1. ОБЛАСТЬ ОБНАРУЖЕНИЯ</Text>
  <View style={s.card}>
   <View style={s.previewWrap}><View style={[s.preview,{backgroundColor:sample?"#D64B55":"#26303C"}]}><View style={s.crossH}/><View style={s.crossV}/><View style={s.scanBox}/><Text style={s.previewLabel}>{sample?"ИЗМЕНЕНИЕ ОБРАЗЦА":"ТЕСТОВЫЙ ОБРАЗЕЦ"}</Text></View></View>
   <TouchableOpacity style={s.secondary} onPress={()=>{setSample(v=>!v);if(running)trigger();else {setLast("Образец изменён — запустите тест");addLog("Образец изменён вручную")}}}><Text style={s.secondaryText}>ИЗМЕНИТЬ ТЕСТОВЫЙ ЦВЕТ</Text></TouchableOpacity>
   <View style={s.setting}><View style={s.row}><Text style={s.item}>Чувствительность</Text><Text style={s.value}>{sensitivity}%</Text></View><View style={s.controls}><TouchableOpacity style={s.step} onPress={()=>step(sensitivity-5,setSensitivity,1,100)}><Text style={s.stepText}>−</Text></TouchableOpacity><View style={s.track}><View style={[s.fill,{width:`${sensitivity}%`}]}/></View><TouchableOpacity style={s.step} onPress={()=>step(sensitivity+5,setSensitivity,1,100)}><Text style={s.stepText}>+</Text></TouchableOpacity></View></View>
   <View style={s.setting}><View style={s.row}><Text style={s.item}>Размер зоны</Text><Text style={s.value}>{zone}%</Text></View><View style={s.controls}><TouchableOpacity style={s.step} onPress={()=>step(zone-2,setZone,4,25)}><Text style={s.stepText}>−</Text></TouchableOpacity><View style={s.track}><View style={[s.fill,{width:`${zone*4}%`}]}/></View><TouchableOpacity style={s.step} onPress={()=>step(zone+2,setZone,4,25)}><Text style={s.stepText}>+</Text></TouchableOpacity></View></View>
  </View>
  <Text style={s.section}>2. ТЕСТОВОЕ ДЕЙСТВИЕ</Text>
  <View style={s.card}>
   <Text style={s.item}>Выбери кнопку внутри тестового стенда</Text>
   <View style={s.targetList}>{(["TEST BUTTON A","TEST BUTTON B","TEST BUTTON C"] as Target[]).map(t=><TouchableOpacity key={t} onPress={()=>setTarget(t)} style={[s.target,target===t&&s.targetSelected]}><Text style={[s.targetText,target===t&&{color:"#fff"}]}>{t}</Text><Text style={s.targetMark}>{target===t?"✓":"○"}</Text></TouchableOpacity>)}</View>
   <View style={s.setting}><View style={s.row}><Text style={s.item}>Задержка перед нажатием</Text><Text style={s.value}>{delay} мс</Text></View><View style={s.controls}><TouchableOpacity style={s.step} onPress={()=>step(delay-25,setDelay,0,1000)}><Text style={s.stepText}>−</Text></TouchableOpacity><View style={s.track}><View style={[s.fill,{width:`${delay/10}%`}]}/></View><TouchableOpacity style={s.step} onPress={()=>step(delay+25,setDelay,0,1000)}><Text style={s.stepText}>+</Text></TouchableOpacity></View></View>
   <View style={[s.row,{marginTop:17}]}><View style={{flex:1}}><Text style={s.item}>Защита от повторных срабатываний</Text><Text style={s.smallNote}>Пауза между тестовыми нажатиями</Text></View><Switch value={cooldown} onValueChange={setCooldown} trackColor={{false:"#39404C",true:RED}}/></View>
   <TouchableOpacity style={s.secondary} onPress={()=>{if(!running){setLast("Сначала запустите тест");return;}trigger()}}><Text style={s.secondaryText}>ПРОВЕРИТЬ ТЕСТОВОЕ НАЖАТИЕ</Text></TouchableOpacity>
  </View>
  <Text style={s.section}>3. РЕЗУЛЬТАТЫ</Text>
  <View style={s.stats}><View style={s.stat}><Text style={s.statNum}>{hits}</Text><Text style={s.statLabel}>ОБНАРУЖЕНИЙ</Text></View><View style={s.stat}><Text style={s.statNum}>{presses}</Text><Text style={s.statLabel}>ТЕСТОВЫХ НАЖАТИЙ</Text></View></View>
  <View style={s.card}><Text style={s.item}>Последнее событие</Text><Text style={s.last}>{last}</Text><View style={s.divider}/><Text style={s.item}>История</Text>{history.length?history.map((h,i)=><Text key={i} style={s.log}>{h}</Text>):<Text style={s.smallNote}>Событий пока нет.</Text>}</View>
  <View style={s.footer}><Text style={s.footerLogo}>XRECORD</Text><Text style={s.smallNote}>Локальный тестовый стенд • Без управления сторонними приложениями</Text></View>
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:"#0A0C11"},page:{padding:18,paddingBottom:42},
 header:{flexDirection:"row",alignItems:"center",gap:12,marginVertical:12},mark:{width:46,height:46,borderRadius:14,backgroundColor:RED,alignItems:"center",justifyContent:"center"},markText:{color:"#fff",fontWeight:"900",fontSize:29},logo:{color:"#fff",fontWeight:"900",fontSize:21,letterSpacing:2},tag:{color:"#778191",fontSize:9,letterSpacing:1.5,marginTop:3},beta:{marginLeft:"auto",borderWidth:1,borderColor:"#59323A",borderRadius:7,padding:7},betaText:{color:"#FF8585",fontSize:9,fontWeight:"900"},
 statusCard:{backgroundColor:"#171C26",borderColor:"#2A303C",borderWidth:1,borderRadius:19,padding:18},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},eyebrow:{color:"#8791A1",fontSize:10,fontWeight:"900",letterSpacing:1.3},pill:{paddingHorizontal:10,paddingVertical:5,borderRadius:20},statusTitle:{color:"#fff",fontSize:19,fontWeight:"800",marginTop:18},muted:{color:"#9AA3B2",fontSize:12,lineHeight:18,marginTop:8},primary:{marginTop:18,padding:16,borderRadius:12,alignItems:"center"},primaryText:{color:"#fff",fontWeight:"900",fontSize:12,letterSpacing:1},
 section:{color:"#8993A3",fontWeight:"900",fontSize:10,letterSpacing:1.5,marginTop:25,marginBottom:10},card:{backgroundColor:"#151A23",borderColor:"#292F3B",borderWidth:1,borderRadius:17,padding:16},previewWrap:{alignItems:"center"},preview:{width:"100%",height:145,borderRadius:13,alignItems:"center",justifyContent:"center",overflow:"hidden"},crossH:{position:"absolute",width:36,height:1,backgroundColor:"#FFFFFF88"},crossV:{position:"absolute",height:36,width:1,backgroundColor:"#FFFFFF88"},scanBox:{width:48,height:48,borderWidth:1.5,borderColor:"#FF7777",borderRadius:7,backgroundColor:"#FFFFFF12"},previewLabel:{position:"absolute",bottom:10,color:"#FFFFFFAA",fontSize:9,fontWeight:"900",letterSpacing:1},
 secondary:{backgroundColor:"#272E3A",borderRadius:10,padding:13,alignItems:"center",marginTop:13},secondaryText:{color:"#F4F5F7",fontSize:10,fontWeight:"900",letterSpacing:.7},setting:{marginTop:18},item:{color:"#F0F2F6",fontSize:12,fontWeight:"700"},value:{color:"#FF7777",fontWeight:"900",fontSize:12},controls:{flexDirection:"row",alignItems:"center",gap:11,marginTop:11},step:{width:29,height:29,backgroundColor:"#2A303B",borderRadius:8,alignItems:"center",justifyContent:"center"},stepText:{color:"#fff",fontSize:19},track:{height:5,backgroundColor:"#343B48",borderRadius:8,flex:1,overflow:"hidden"},fill:{height:5,backgroundColor:RED},targetList:{gap:8,marginTop:12},target:{padding:12,borderRadius:10,backgroundColor:"#202631",borderWidth:1,borderColor:"#303744",flexDirection:"row",justifyContent:"space-between"},targetSelected:{borderColor:RED,backgroundColor:"#38242A"},targetText:{color:"#AEB6C3",fontSize:11,fontWeight:"800"},targetMark:{color:"#FF8585",fontWeight:"900"},smallNote:{color:"#788292",fontSize:10,lineHeight:15,marginTop:5},divider:{height:1,backgroundColor:"#2A303A",marginVertical:15},stats:{flexDirection:"row",gap:10},stat:{flex:1,backgroundColor:"#171C26",borderRadius:14,padding:16,borderWidth:1,borderColor:"#292F3B"},statNum:{color:"#fff",fontSize:25,fontWeight:"900"},statLabel:{color:"#858F9F",fontSize:8,fontWeight:"900",letterSpacing:.8,marginTop:5},last:{color:"#FF9A9A",fontSize:12,marginTop:8},log:{color:"#9CA5B3",fontSize:10,paddingVertical:5,borderBottomWidth:1,borderBottomColor:"#252B35"},footer:{alignItems:"center",marginTop:28},footerLogo:{color:"#687181",fontWeight:"900",letterSpacing:3,fontSize:11}
});