import { useState, useMemo, useEffect, useRef } from "react";
import { api } from "./api.js";

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════
const T = {
  ar: {
    appName:"نظام إدارة المخزون", tag:"تحكم ذكي وشامل",
    login:"تسجيل الدخول", username:"اسم المستخدم", password:"كلمة المرور",
    enterSystem:"دخول النظام", logout:"خروج", demo:"تجريبي: admin / admin",
    badLogin:"بيانات غير صحيحة", loading:"جاري التحميل...",
    nav:{dash:"لوحة التحكم",inv:"المخزون",tx:"الحركات",dept:"الأقسام",users:"المستخدمون",profile:"ملفي الشخصي",settings:"الإعدادات"},
    dash:{total:"إجمالي الأصناف",value:"قيمة المخزون",low:"مخزون منخفض",
      todayTx:"حركات اليوم",recent:"آخر الحركات"},
    inv:{title:"المخزون",add:"إضافة صنف",edit:"تعديل",del:"حذف",view:"عرض",
      name:"اسم الصنف",nameEn:"الاسم بالإنجليزية",desc:"الوصف",price:"السعر",
      qty:"الكمية",min:"الحد الأدنى",sku:"رمز SKU",barcode:"الباركود / QR",
      dept:"القسم",cat:"التصنيف",type:"نوع التعبئة",status:"الحالة",
      photo:"رابط الصورة",scan:"مسح الباركود",lookup:"بحث بالباركود",
      looking:"جاري البحث...",found:"تم العثور ✓",notFound:"لم يتم العثور",
      stockIn:"وارد",stockOut:"صادر",allStatus:"كل الحالات",allDept:"كل الأقسام",
      datasheet:"رقم الكتالوج / datasheet",unitsPerPkg:"وحدات في الحزمة",
      addPhoto:"إضافة صورة",deletePhoto:"حذف الصورة",photos:"الصور"},
    tx:{title:"الحركات",record:"تسجيل حركة",type:"النوع",
      in:"وارد (إضافة)",out:"صادر (صرف)",
      source:"المصدر / المورد",dest:"الوجهة / المشروع",
      date:"التاريخ",user:"المسؤول",notes:"ملاحظات",item:"الصنف",qty:"الكمية",allType:"كل الحركات",
      editTx:"تعديل الحركة",deleteTx:"حذف الحركة"},
    settings:{title:"الإعدادات",currency:"العملة",currencyLabel:"عملة النظام",
      cloudinary:"مساحة Cloudinary",storageUsed:"المساحة المستخدمة",
      clearTxs:"حذف جميع الحركات",clearTxsConfirm:"سيتم حذف كل الحركات نهائياً. هل أنت متأكد؟",
      saved:"تم حفظ الإعدادات ✓"},
    dept:{title:"الأقسام والتصنيفات",addDept:"إضافة قسم",addCat:"إضافة تصنيف",
      deptName:"اسم القسم",catName:"اسم التصنيف",color:"اللون"},
    users:{title:"المستخدمون",add:"إضافة مستخدم",edit:"تعديل المستخدم",name:"الاسم الكامل",email:"البريد الإلكتروني",role:"الصلاحية",
      newPass:"كلمة مرور جديدة (اتركها فارغة للإبقاء)",permsTitle:"الصلاحيات",
      roles:{admin:"مدير النظام",manager:"مدير تشغيل",warehouse:"أمين مخزن",viewer:"مشاهد"},
      permLabels:{canAdd:"إضافة أصناف",canEdit:"تعديل أصناف",canDelete:"حذف أصناف",canTx:"تسجيل حركات",canManageUsers:"إدارة المستخدمين",canManageDepts:"إدارة الأقسام"},
      inactive:"تعطيل",active:"تفعيل",joinedOn:"تاريخ الانضمام",lastActive:"آخر نشاط",txCount:"عدد الحركات"},
    profile:{title:"الملف الشخصي",myPerms:"صلاحياتي",allowed:"مسموح",denied:"غير مسموح"},
    prev:"السابق",next:"التالي",page:"صفحة",of:"من",
    search:"بحث...",
    globalSearch:{placeholder:"ابحث في النظام...",items:"أصناف",txs:"حركات",users:"مستخدمون",depts:"أقسام",noResults:"لا توجد نتائج",viewAll:"عرض الكل"},
    status:{active:"نشط",inactive:"غير نشط",discontinued:"متوقف"},
    types:{unit:"وحدة",box:"صندوق",pack:"حزمة",group:"مجموعة",roll:"لفة",bag:"كيس",pallet:"منصة"},
    save:"حفظ",cancel:"إلغاء",delete:"حذف",confirm:"تأكيد الحذف",
    confirmMsg:"لا يمكن التراجع عن هذا الإجراء",
    search:"بحث...",all:"الكل",noData:"لا توجد بيانات",
    scanner:{title:"مسح الباركود",hint:"وجّه الكاميرا نحو الباركود",
      error:"لا يمكن الوصول للكاميرا. أدخل يدوياً:",manual:"إدخال يدوي",
      detected:"تم اكتشاف:",use:"استخدام هذا الباركود",
      notSupported:"المتصفح لا يدعم هذه الميزة — استخدم Chrome"},
    lowAlert:"صنف يحتاج إعادة طلب",
    saved:"تم الحفظ بنجاح ✓",error:"حدث خطأ",
    perm:"ليس لديك صلاحية لهذا الإجراء",
  },
  en: {
    appName:"Inventory Management System",tag:"Smart & Comprehensive Control",
    login:"Login",username:"Username",password:"Password",
    enterSystem:"Enter System",logout:"Sign Out",demo:"Demo: admin / admin",
    badLogin:"Invalid credentials",loading:"Loading...",
    nav:{dash:"Dashboard",inv:"Inventory",tx:"Transactions",dept:"Departments",users:"Users",profile:"My Profile",settings:"Settings"},
    dash:{total:"Total Items",value:"Inventory Value",low:"Low Stock",
      todayTx:"Today's Transactions",recent:"Recent Activity"},
    inv:{title:"Inventory",add:"Add Item",edit:"Edit",del:"Delete",view:"View",
      name:"Item Name",nameEn:"Name (EN)",desc:"Description",price:"Price",
      qty:"Quantity",min:"Min. Threshold",sku:"SKU",barcode:"Barcode / QR",
      dept:"Department",cat:"Category",type:"Package Type",status:"Status",
      photo:"Photo URL",scan:"Scan Barcode",lookup:"Lookup",
      looking:"Looking up...",found:"Found ✓",notFound:"Not found",
      stockIn:"IN",stockOut:"OUT",allStatus:"All Status",allDept:"All Departments",
      datasheet:"Datasheet No.",unitsPerPkg:"Units per Package",
      addPhoto:"Add Photo",deletePhoto:"Delete Photo",photos:"Photos"},
    tx:{title:"Transactions",record:"Record Transaction",type:"Type",
      in:"Stock In",out:"Stock Out",
      source:"Source / Supplier",dest:"Destination / Project",
      date:"Date",user:"User",notes:"Notes",item:"Item",qty:"Quantity",allType:"All Types",
      editTx:"Edit Transaction",deleteTx:"Delete Transaction"},
    settings:{title:"Settings",currency:"Currency",currencyLabel:"System Currency",
      cloudinary:"Cloudinary Storage",storageUsed:"Storage Used",
      clearTxs:"Clear All Transactions",clearTxsConfirm:"All transactions will be permanently deleted. Are you sure?",
      saved:"Settings saved ✓"},
    dept:{title:"Departments & Categories",addDept:"Add Department",addCat:"Add Category",
      deptName:"Department Name",catName:"Category Name",color:"Color"},
    users:{title:"Users",add:"Add User",edit:"Edit User",name:"Full Name",email:"Email",role:"Role",
      newPass:"New Password (leave blank to keep)",permsTitle:"Permissions",
      roles:{admin:"System Admin",manager:"Manager",warehouse:"Warehouse Staff",viewer:"Viewer"},
      permLabels:{canAdd:"Add Items",canEdit:"Edit Items",canDelete:"Delete Items",canTx:"Record Transactions",canManageUsers:"Manage Users",canManageDepts:"Manage Departments"},
      inactive:"Deactivate",active:"Activate",joinedOn:"Joined",lastActive:"Last Active",txCount:"Transactions"},
    profile:{title:"My Profile",myPerms:"My Permissions",allowed:"Allowed",denied:"Denied"},
    prev:"Prev",next:"Next",page:"Page",of:"of",
    search:"Search...",
    globalSearch:{placeholder:"Search system...",items:"Items",txs:"Transactions",users:"Users",depts:"Departments",noResults:"No results",viewAll:"View all"},
    status:{active:"Active",inactive:"Inactive",discontinued:"Discontinued"},
    types:{unit:"Unit",box:"Box",pack:"Pack",group:"Group",roll:"Roll",bag:"Bag",pallet:"Pallet"},
    save:"Save",cancel:"Cancel",delete:"Delete",confirm:"Confirm Delete",
    confirmMsg:"This action cannot be undone",
    search:"Search...",all:"All",noData:"No data found",
    scanner:{title:"Scan Barcode",hint:"Point camera at barcode or QR code",
      error:"Cannot access camera. Enter manually:",manual:"Manual Entry",
      detected:"Detected:",use:"Use this barcode",
      notSupported:"Browser not supported — use Chrome or Edge"},
    lowAlert:"items need reordering",
    saved:"Saved successfully ✓",error:"An error occurred",
    perm:"You don't have permission for this action",
  }
};

const CURRENCIES=[
  {code:"USD",symbol:"$",    name:"US Dollar"},
  {code:"EUR",symbol:"€",    name:"Euro"},
  {code:"GBP",symbol:"£",    name:"British Pound"},
  {code:"EGP",symbol:"ج.م", name:"Egyptian Pound"},
  {code:"SAR",symbol:"ر.س", name:"Saudi Riyal"},
  {code:"AED",symbol:"د.إ", name:"UAE Dirham"},
  {code:"QAR",symbol:"ر.ق", name:"Qatari Riyal"},
  {code:"KWD",symbol:"د.ك", name:"Kuwaiti Dinar"},
  {code:"BHD",symbol:"د.ب", name:"Bahraini Dinar"},
  {code:"OMR",symbol:"ر.ع", name:"Omani Rial"},
  {code:"JOD",symbol:"د.أ", name:"Jordanian Dinar"},
  {code:"TRY",symbol:"₺",   name:"Turkish Lira"},
  {code:"INR",symbol:"₹",   name:"Indian Rupee"},
  {code:"PKR",symbol:"₨",   name:"Pakistani Rupee"},
];
const getCurrencySymbol=code=>(CURRENCIES.find(c=>c.code===code)||CURRENCIES[0]).symbol;

const ROLE_PERMS={
  admin:    {canAdd:true,canEdit:true,canDelete:true,canTx:true,canManageUsers:true,canManageDepts:true},
  manager:  {canAdd:true,canEdit:true,canDelete:false,canTx:true,canManageUsers:false,canManageDepts:true},
  warehouse:{canAdd:false,canEdit:false,canDelete:false,canTx:true,canManageUsers:false,canManageDepts:false},
  viewer:   {canAdd:false,canEdit:false,canDelete:false,canTx:false,canManageUsers:false,canManageDepts:false},
};
const PERM_KEYS=["canAdd","canEdit","canDelete","canTx","canManageUsers","canManageDepts"];
const resolvePerms=u=>({...(ROLE_PERMS[u?.role]||ROLE_PERMS.viewer),...(u?.permissions||{})});

const today=()=>new Date().toISOString().split("T")[0];
const money=n=>Number(n||0).toLocaleString();
const stOf=p=>p.qty===0?"out":p.qty<=p.minThreshold?"low":"ok";
const C={
  bg:"#f1f5f9",surf:"#fff",surf2:"#f8fafc",bdr:"#e2e8f0",bdr2:"#cbd5e1",
  tx:"#0f172a",tx2:"#475569",tx3:"#94a3b8",
  primary:"#1d4ed8",primarySoft:"#eff6ff",
  green:"#16a34a",greenSoft:"#f0fdf4",
  red:"#dc2626",redSoft:"#fef2f2",
  amber:"#d97706",amberSoft:"#fffbeb",
  sidebar:"#0f172a",sidebarBdr:"#1e293b",
};
const R={sm:8,md:12,lg:16};
const SH={sm:"0 1px 3px rgba(0,0,0,.07)",lg:"0 16px 48px rgba(0,0,0,.18)"};
const baseInput={width:"100%",padding:"9px 12px",border:`1px solid ${C.bdr2}`,borderRadius:R.sm,
  fontSize:13.5,color:C.tx,background:C.surf,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};

// ── Responsive helpers ────────────────────────────────────────────────────────
const useMobile=()=>{const[m,setM]=useState(window.innerWidth<640);useEffect(()=>{const h=()=>setM(window.innerWidth<640);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return m;};
const useTablet=()=>{const[m,setM]=useState(window.innerWidth<1024);useEffect(()=>{const h=()=>setM(window.innerWidth<1024);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return m;};

// ── Pagination hook ───────────────────────────────────────────────────────────
function usePaginate(items,defaultPerPage=15){
  const[pg,setPg]=useState(1);
  const[perPage,setPerPageRaw]=useState(defaultPerPage);
  const total=Math.max(1,Math.ceil(items.length/perPage));
  const page=Math.min(pg,total);
  const slice=items.slice((page-1)*perPage,page*perPage);
  const setPerPage=n=>{setPerPageRaw(n);setPg(1);};
  useEffect(()=>setPg(1),[items.length]);
  return{slice,page,total,perPage,setPerPage,setPg:p=>setPg(Math.max(1,Math.min(total,p)))};
}
function Paginate({page,total,setPg,perPage,setPerPage,t,totalItems}){
  if(total<=1&&totalItems<=15)return null;
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:16,flexWrap:"wrap"}}>
      <select value={perPage} onChange={e=>setPerPage(Number(e.target.value))}
        style={{padding:"5px 8px",borderRadius:R.sm,border:`1px solid ${C.bdr2}`,background:C.surf,fontSize:12,color:C.tx,cursor:"pointer",fontFamily:"inherit"}}>
        {[10,15,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}
      </select>
      <button onClick={()=>setPg(page-1)} disabled={page===1}
        style={{padding:"6px 14px",borderRadius:R.sm,border:`1px solid ${C.bdr2}`,background:C.surf,cursor:page===1?"not-allowed":"pointer",color:page===1?C.tx3:C.tx,fontSize:13,fontFamily:"inherit"}}>
        ‹ {t.prev}
      </button>
      {Array.from({length:Math.min(total,7)},(_,i)=>{
        let p;
        if(total<=7)p=i+1;
        else if(page<=4)p=i+1;
        else if(page>=total-3)p=total-6+i;
        else p=page-3+i;
        if(p<1||p>total)return null;
        return(
          <button key={p} onClick={()=>setPg(p)}
            style={{width:34,height:34,borderRadius:R.sm,border:`1px solid ${page===p?C.primary:C.bdr2}`,
              background:page===p?C.primary:C.surf,color:page===p?"#fff":C.tx,fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:page===p?700:400}}>
            {p}
          </button>
        );
      })}
      <button onClick={()=>setPg(page+1)} disabled={page===total}
        style={{padding:"6px 14px",borderRadius:R.sm,border:`1px solid ${C.bdr2}`,background:C.surf,cursor:page===total?"not-allowed":"pointer",color:page===total?C.tx3:C.tx,fontSize:13,fontFamily:"inherit"}}>
        {t.next} ›
      </button>
      <span style={{fontSize:12,color:C.tx3}}>{t.page} {page} {t.of} {total}</span>
    </div>
  );
}

// ── Tiny components ───────────────────────────────────────────────────────────
function Btn({children,onClick,type="button",color="primary",size="md",disabled,full,style:sx}){
  const v={
    primary:{background:C.primary,color:"#fff",border:"none"},
    ghost:{background:C.surf,color:C.tx,border:`1px solid ${C.bdr2}`},
    red:{background:C.redSoft,color:C.red,border:`1px solid #fca5a5`},
    green:{background:C.greenSoft,color:C.green,border:`1px solid #86efac`},
    dark:{background:C.sidebar,color:"#fff",border:"none"},
  };
  return(
    <button type={type} onClick={onClick} disabled={disabled}
      style={{display:"inline-flex",alignItems:"center",gap:6,borderRadius:R.sm,fontWeight:600,
        cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",opacity:disabled?.5:1,
        padding:size==="sm"?"5px 10px":"9px 16px",fontSize:size==="sm"?12:13,
        width:full?"100%":"auto",justifyContent:full?"center":"flex-start",
        ...v[color],...sx}}>
      {children}
    </button>
  );
}
function Inp({label,value,onChange,type="text",placeholder,required,min,max,step,readOnly}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {label&&<label style={{fontSize:11.5,fontWeight:600,color:C.tx2}}>{label}</label>}
      <input value={value??""} onChange={onChange} type={type} placeholder={placeholder}
        required={required} min={min} max={max} step={step} readOnly={readOnly}
        style={{...baseInput,background:readOnly?C.surf2:C.surf}}/>
    </div>
  );
}
function Sel({label,value,onChange,children}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {label&&<label style={{fontSize:11.5,fontWeight:600,color:C.tx2}}>{label}</label>}
      <select value={value??""} onChange={onChange} style={{...baseInput,cursor:"pointer"}}>{children}</select>
    </div>
  );
}
function Txt({label,value,onChange,rows=3}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {label&&<label style={{fontSize:11.5,fontWeight:600,color:C.tx2}}>{label}</label>}
      <textarea value={value??""} onChange={onChange} rows={rows}
        style={{...baseInput,resize:"vertical",minHeight:68}}/>
    </div>
  );
}
function G2({children,sx}){return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,...sx}}>{children}</div>;}
function S2({children}){return <div style={{gridColumn:"span 2"}}>{children}</div>;}
function Card({children,style:sx,...props}){
  return <div style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:R.lg,boxShadow:SH.sm,...sx}} {...props}>{children}</div>;
}
function Prog({pct,color=C.primary,h=5}){
  return(<div style={{height:h,background:C.bdr,borderRadius:99,overflow:"hidden"}}>
    <div style={{width:`${Math.min(100,Math.max(0,pct))}%`,height:"100%",background:color,borderRadius:99}}/>
  </div>);
}
function Toast({msg,type="success",onDone}){
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[]);
  return(
    <div style={{position:"fixed",top:20,insetInlineEnd:20,zIndex:99999,
      background:type==="success"?C.green:C.red,color:"#fff",
      padding:"12px 20px",borderRadius:R.md,fontWeight:600,fontSize:13,
      boxShadow:SH.lg,animation:"slideIn .2s ease"}}>
      {msg}
    </div>
  );
}
function Spinner(){
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:C.tx3,fontSize:14}}>⏳ جاري التحميل...</div>;
}
function ModalShell({title,onClose,wide,children}){
  return(
    <div onMouseDown={e=>e.target===e.currentTarget&&onClose()}
      style={{position:"fixed",inset:0,background:"rgba(15,23,42,.55)",backdropFilter:"blur(4px)",
        zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:C.surf,borderRadius:R.lg,width:"100%",maxWidth:wide?780:520,
        maxHeight:"90vh",overflowY:"auto",boxShadow:SH.lg,margin:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"20px 24px 0",marginBottom:18,position:"sticky",top:0,background:C.surf,zIndex:1,
          borderBottom:`1px solid ${C.bdr}`,paddingBottom:16}}>
          <span style={{fontSize:16,fontWeight:700,color:C.tx}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
            color:C.tx3,fontSize:22,lineHeight:1,padding:4}}>✕</button>
        </div>
        <div style={{padding:"16px 24px 24px"}}>{children}</div>
      </div>
    </div>
  );
}

// ── Barcode Scanner (ZXing — all browsers) ───────────────────────────────────
function BarcodeScanner({onDetect,onClose,t,lang}){
  const isAR=lang==="ar";
  const st=t.scanner;
  const videoRef=useRef(null);
  const readerRef=useRef(null);
  const streamRef=useRef(null);
  const [detected,setDetected]=useState(null);
  const [error,setError]=useState(null);
  const [manual,setManual]=useState("");
  const [ready,setReady]=useState(false);

  const stopReader=()=>{
    try{readerRef.current?.reset();}catch{}
    try{streamRef.current?.getTracks().forEach(t=>t.stop());}catch{}
  };

  const startCamera=async()=>{
    setError(null);
    setReady(false);
    try{
      // Step 1: explicitly request camera permission first (required for Edge/Firefox/Safari)
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});
      streamRef.current=stream;
      // attach stream to video so user sees something immediately
      if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play().catch(()=>{});}

      // Step 2: load ZXing and start decoding
      const {BrowserMultiFormatReader}=await import("@zxing/browser");
      const reader=new BrowserMultiFormatReader();
      readerRef.current=reader;

      // Step 3: enumerate devices (now permission is already granted)
      const devices=await BrowserMultiFormatReader.listVideoInputDevices();
      const device=devices.find(d=>/(back|rear|environment)/i.test(d.label))||devices[0];
      const deviceId=device?.deviceId||undefined;

      setReady(true);
      await reader.decodeFromVideoDevice(deviceId,videoRef.current,(result,err)=>{
        if(result){stopReader();setDetected(result.getText());}
      });
    }catch(e){
      const msg=(e?.message||e?.name||"").toLowerCase();
      if(msg.includes("notallowed")||msg.includes("permission")||msg.includes("denied")){
        setError(isAR
          ?"🔒 تم رفض إذن الكاميرا.\nفي Edge أو Chrome: انقر على أيقونة القفل 🔒 في شريط العنوان ← السماح بالكاميرا ← أعد تحميل الصفحة."
          :"🔒 Camera permission denied.\nClick the lock icon 🔒 in the address bar → Allow Camera → reload the page.");
      }else if(msg.includes("notfound")||msg.includes("devicenotfound")){
        setError(isAR?"❌ لم يتم العثور على كاميرا في هذا الجهاز.":"❌ No camera found on this device.");
      }else if(msg.includes("notreadable")||msg.includes("trackstart")){
        setError(isAR?"⚠️ الكاميرا مستخدمة من تطبيق آخر. أغلقه وحاول مجدداً.":"⚠️ Camera is in use by another app. Close it and retry.");
      }else{
        setError((isAR?"❌ خطأ في الكاميرا: ":"❌ Camera error: ")+e?.message);
      }
    }
  };

  useEffect(()=>{
    startCamera();
    return stopReader;
  },[]);

  const use=code=>{stopReader();onDetect(code);onClose();};

  return(
    <ModalShell title={st.title} onClose={()=>{stopReader();onClose();}}>
      <p style={{fontSize:13,color:C.tx3,textAlign:"center",marginBottom:14}}>{st.hint}</p>

      {detected?(
        <div style={{background:C.greenSoft,border:`1px solid #86efac`,borderRadius:R.md,padding:16,textAlign:"center",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:C.green,marginBottom:6}}>{st.detected}</div>
          <div style={{fontSize:20,fontWeight:800,fontFamily:"monospace",marginBottom:14}}>{detected}</div>
          <Btn color="green" onClick={()=>use(detected)}>{st.use}</Btn>
        </div>
      ):(
        <>
          {error?(
            <div style={{background:C.amberSoft,border:`1px solid #fcd34d`,borderRadius:R.md,padding:14,marginBottom:14}}>
              <p style={{fontSize:13,color:C.amber,margin:0,lineHeight:1.6}}>{error}</p>
              <Btn color="ghost" size="sm" style={{marginTop:10}} onClick={startCamera}>
                🔄 {t.lang==="ar"?"إعادة المحاولة":"Retry Camera"}
              </Btn>
            </div>
          ):(
            <div style={{borderRadius:R.md,overflow:"hidden",background:"#000",marginBottom:14,position:"relative",aspectRatio:"16/9"}}>
              <video ref={videoRef} muted playsInline style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              {ready&&(
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                  <div style={{width:200,height:120,border:"2px solid #22c55e",borderRadius:8,boxShadow:"0 0 0 9999px rgba(0,0,0,.45)"}}/>
                </div>
              )}
              {!ready&&(
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13}}>
                  ⏳
                </div>
              )}
            </div>
          )}
          <div style={{height:1,background:C.bdr,margin:"12px 0"}}/>
          <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:8}}>{st.manual}</div>
          <div style={{display:"flex",gap:8}}>
            <input value={manual} onChange={e=>setManual(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&manual.trim()&&use(manual.trim())}
              placeholder="e.g. 6221023001001"
              style={{...baseInput,flex:1,fontFamily:"monospace"}}/>
            <Btn color="primary" onClick={()=>manual.trim()&&use(manual.trim())}>→</Btn>
          </div>
        </>
      )}
    </ModalShell>
  );
}

// ── Item Form ─────────────────────────────────────────────────────────────────
function ItemForm({init,depts,cats,lang,t,onSave,onClose}){
  const inv=t.inv;
  const isAR=lang==="ar";
  const [f,setF]=useState({
    name:"",nameEn:"",deptId:"",catId:"",sku:"",barcode:"",
    price:"",qty:"",minThreshold:"",type:"unit",status:"active",description:"",photo:"",
    datasheet:"",unitsPerPackage:1,images:[],
    ...(init?{...init,deptId:init.deptId?._id||init.deptId||"",catId:init.catId?._id||init.catId||"",
      images:init.images||[],datasheet:init.datasheet||"",unitsPerPackage:init.unitsPerPackage||1}:{})
  });
  const [scanning,setScanning]=useState(false);
  const [lookMsg,setLookMsg]=useState("");
  const [looking,setLooking]=useState(false);
  const [photoFile,setPhotoFile]=useState(null);
  const [extraFiles,setExtraFiles]=useState([]);
  const [uploadingExtra,setUploadingExtra]=useState(false);
  const [saving,setSaving]=useState(false);
  const [imgIdx,setImgIdx]=useState(0);
  const debounceRef=useRef(null);
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const deptCats=cats.filter(c=>(c.deptId?._id||c.deptId)===f.deptId);
  const needsUnits=f.type!=="unit"&&f.type!=="roll";
  // Merged image list for preview (existing images array + photoUrl if no images)
  const allImgs=[...f.images];
  if(f.photo&&!allImgs.find(img=>img.url===f.photo))allImgs.unshift({url:f.photo,publicId:""});

  const lookup=async(barcode)=>{
    const code=(barcode||"").trim();
    if(!code){setLookMsg("");return;}
    setLooking(true);setLookMsg("");
    // 1. Check own inventory first
    try{
      const existing=await api.getByBarcode(code);
      if(existing){
        setF(p=>({...p,name:existing.name,nameEn:existing.nameEn||p.nameEn,
          description:existing.description||p.description,photo:existing.photo||p.photo,
          price:existing.price||p.price,type:existing.type||p.type}));
        setLookMsg(inv.found);setLooking(false);return;
      }
    }catch{}
    // 2. Try Open Food Facts
    try{
      const r=await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`,{signal:AbortSignal.timeout(5000)});
      const d=await r.json();
      if(d.status===1&&d.product){
        const p=d.product;
        const name=p.product_name_ar||p.product_name||p.generic_name||"";
        const nameEn=p.product_name_en||p.product_name||"";
        const desc=[p.ingredients_text_en||p.ingredients_text,p.quantity,p.packaging].filter(Boolean).join(" · ");
        const photo=p.image_front_url||p.image_url||"";
        const brand=p.brands||"";
        setF(prev=>({...prev,
          name:name||prev.name,
          nameEn:nameEn||prev.nameEn,
          description:desc?`${brand?brand+" — ":""}${desc}`:prev.description,
          photo:photo||prev.photo,
        }));
        setLookMsg(inv.found);setLooking(false);return;
      }
    }catch{}
    // 3. Try UPC Item DB
    try{
      const r=await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`,{signal:AbortSignal.timeout(5000)});
      const d=await r.json();
      if(d.code==="OK"&&d.items?.length){
        const item=d.items[0];
        setF(prev=>({...prev,
          name:item.title||prev.name,
          nameEn:item.title||prev.nameEn,
          description:[item.description,item.brand,item.category].filter(Boolean).join(" · ")||prev.description,
          photo:item.images?.[0]||prev.photo,
        }));
        setLookMsg(inv.found);setLooking(false);return;
      }
    }catch{}
    setLookMsg(inv.notFound);
    setLooking(false);
  };

  useEffect(()=>{
    const code=f.barcode?.trim();
    if(!code){setLookMsg("");return;}
    clearTimeout(debounceRef.current);
    debounceRef.current=setTimeout(()=>lookup(code),700);
    return()=>clearTimeout(debounceRef.current);
  },[f.barcode]);

  const deleteExistingImg=async(publicId,url)=>{
    if(init?._id&&publicId){
      try{const r=await api.deleteItemPhoto(init._id,publicId);s("images",r.images||[]);if(r.photo!==undefined)s("photo",r.photo);}
      catch{}
    } else {
      s("images",f.images.filter(img=>img.url!==url));
      if(f.photo===url)s("photo","");
    }
  };

  const submit=async()=>{
    if(!f.name.trim())return;
    setSaving(true);
    try{
      const payload={...f,price:+f.price||0,qty:+f.qty||0,minThreshold:+f.minThreshold||0,
        unitsPerPackage:+f.unitsPerPackage||1};
      const saved=await onSave(payload,init?._id);
      // Upload primary photo if file selected
      if(photoFile&&saved?._id){
        try{await api.uploadPhoto(saved._id,photoFile);}catch{}
      }
      // Upload extra images
      if(extraFiles.length&&saved?._id){
        setUploadingExtra(true);
        for(const file of extraFiles){
          try{await api.addItemPhoto(saved._id,file);}catch{}
        }
        setUploadingExtra(false);
      }
    }finally{setSaving(false);}
  };

  return(
    <>
      {scanning&&<BarcodeScanner t={t} lang={lang} onClose={()=>setScanning(false)} onDetect={code=>{s("barcode",code);setScanning(false);}}/>}
      <div>
        {/* Image gallery */}
        {allImgs.length>0&&(
          <div style={{marginBottom:14}}>
            <div style={{borderRadius:R.md,overflow:"hidden",height:160,background:C.surf2,position:"relative",marginBottom:8}}>
              <img src={allImgs[imgIdx]?.url} alt="" style={{width:"100%",height:"100%",objectFit:"contain",background:C.surf2}}
                onError={e=>{e.target.style.display="none";}}/>
              {allImgs.length>1&&(
                <>
                  <button onClick={()=>setImgIdx(i=>Math.max(0,i-1))} disabled={imgIdx===0}
                    style={{position:"absolute",top:"50%",insetInlineStart:6,transform:"translateY(-50%)",background:"rgba(0,0,0,.5)",border:"none",color:"#fff",borderRadius:99,width:28,height:28,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                  <button onClick={()=>setImgIdx(i=>Math.min(allImgs.length-1,i+1))} disabled={imgIdx===allImgs.length-1}
                    style={{position:"absolute",top:"50%",insetInlineEnd:6,transform:"translateY(-50%)",background:"rgba(0,0,0,.5)",border:"none",color:"#fff",borderRadius:99,width:28,height:28,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
                </>
              )}
              <div style={{position:"absolute",bottom:6,insetInlineEnd:6,display:"flex",gap:4}}>
                <button onClick={()=>deleteExistingImg(allImgs[imgIdx]?.publicId,allImgs[imgIdx]?.url)}
                  style={{background:"rgba(220,38,38,.85)",border:"none",color:"#fff",borderRadius:R.sm,padding:"3px 7px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                  🗑 {inv.deletePhoto}
                </button>
              </div>
            </div>
            {allImgs.length>1&&(
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
                {allImgs.map((img,i)=>(
                  <div key={i} onClick={()=>setImgIdx(i)}
                    style={{width:52,height:52,borderRadius:R.sm,overflow:"hidden",flexShrink:0,cursor:"pointer",
                      border:`2px solid ${i===imgIdx?C.primary:C.bdr}`,background:C.surf2}}>
                    <img src={img.url} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{e.target.style.display="none";}}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <G2>
          <Inp label={inv.name+"*"} required value={f.name} onChange={e=>s("name",e.target.value)}/>
          <Inp label={inv.nameEn} value={f.nameEn} onChange={e=>s("nameEn",e.target.value)}/>
          <Sel label={inv.dept+"*"} value={f.deptId} onChange={e=>{s("deptId",e.target.value);s("catId","");}}>
            <option value="">--</option>
            {depts.map(d=><option key={d._id||d.id} value={d._id||d.id}>{isAR?d.name:d.nameEn||d.name}</option>)}
          </Sel>
          <Sel label={inv.cat} value={f.catId} onChange={e=>s("catId",e.target.value)}>
            <option value="">--</option>
            {deptCats.map(c=><option key={c._id||c.id} value={c._id||c.id}>{isAR?c.name:c.nameEn||c.name}</option>)}
          </Sel>
          <S2>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:11.5,fontWeight:600,color:C.tx2}}>{inv.barcode}</label>
              <div style={{display:"flex",gap:8}}>
                <input value={f.barcode} onChange={e=>s("barcode",e.target.value)}
                  placeholder="e.g. 6221023001001" style={{...baseInput,flex:1,fontFamily:"monospace"}}/>
                <Btn color="ghost" size="sm" type="button" onClick={()=>setScanning(true)}>📷 {inv.scan}</Btn>
                <Btn color="ghost" size="sm" type="button" onClick={()=>lookup(f.barcode)} disabled={looking||!f.barcode}>
                  {looking?"⏳":inv.lookup}
                </Btn>
              </div>
              {lookMsg&&<span style={{fontSize:12,color:lookMsg.includes("✓")?C.green:C.tx3}}>{lookMsg}</span>}
            </div>
          </S2>
          <Inp label="SKU" value={f.sku} onChange={e=>s("sku",e.target.value)} placeholder="XX-001"/>
          <Inp label={inv.datasheet} value={f.datasheet||""} onChange={e=>s("datasheet",e.target.value)} placeholder="e.g. DS-2024-001"/>
          <Sel label={inv.type} value={f.type} onChange={e=>s("type",e.target.value)}>
            {Object.entries(t.types).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </Sel>
          {needsUnits&&<Inp label={inv.unitsPerPkg} type="number" min="1" value={f.unitsPerPackage} onChange={e=>s("unitsPerPackage",e.target.value)}/>}
          <Inp label={inv.price+"*"} required type="number" step="0.01" min="0" value={f.price} onChange={e=>s("price",e.target.value)}/>
          <Inp label={inv.qty+"*"} required type="number" min="0" value={f.qty} onChange={e=>s("qty",e.target.value)}/>
          <Inp label={inv.min} type="number" min="0" value={f.minThreshold} onChange={e=>s("minThreshold",e.target.value)}/>
          <Sel label={inv.status} value={f.status} onChange={e=>s("status",e.target.value)}>
            {Object.entries(t.status).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </Sel>
          <S2><Inp label={inv.photo+" (URL)"} value={f.photo||""} onChange={e=>s("photo",e.target.value)} placeholder="https://..."/></S2>
          <S2>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:11.5,fontWeight:600,color:C.tx2}}>{isAR?"الصورة الرئيسية":"Primary Photo"}</label>
              <input type="file" accept="image/*" onChange={e=>setPhotoFile(e.target.files[0])}
                style={{...baseInput,padding:"6px"}}/>
            </div>
          </S2>
          {init?._id&&<S2>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:11.5,fontWeight:600,color:C.tx2}}>📸 {inv.addPhoto} ({isAR?"متعددة":"multiple"})</label>
              <input type="file" accept="image/*" multiple onChange={e=>setExtraFiles(Array.from(e.target.files))}
                style={{...baseInput,padding:"6px"}}/>
              {uploadingExtra&&<span style={{fontSize:12,color:C.tx3}}>⏳ {isAR?"جاري رفع الصور...":"Uploading images..."}</span>}
              {extraFiles.length>0&&!uploadingExtra&&<span style={{fontSize:12,color:C.green}}>✓ {extraFiles.length} {isAR?"ملف محدد":"file(s) selected — will upload on save"}</span>}
            </div>
          </S2>}
          <S2><Txt label={inv.desc} value={f.description||""} onChange={e=>s("description",e.target.value)}/></S2>
        </G2>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}>
          <Btn color="ghost" onClick={onClose}>{t.cancel}</Btn>
          <Btn color="primary" onClick={submit} disabled={saving}>{saving?"⏳":t.save}</Btn>
        </div>
      </div>
    </>
  );
}

// ── Transaction Form ──────────────────────────────────────────────────────────
function TxForm({items,currentUser,lang,t,onSave,onClose,prefillId}){
  const tx=t.tx;
  const isAR=lang==="ar";
  const [f,setF]=useState({type:"OUT",itemId:prefillId||"",qty:"",source:"",dest:"",date:today(),notes:""});
  const [saving,setSaving]=useState(false);
  const [q,setQ]=useState("");
  const [showDrop,setShowDrop]=useState(false);
  const [scanning,setScanning]=useState(false);
  const [barcodeMsg,setBarcodeMsg]=useState("");
  const dropRef=useRef(null);
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const sel=items.find(i=>(i._id||i.id)===f.itemId);

  const activeItems=useMemo(()=>items.filter(i=>i.status==="active"),[items]);
  const filtered=useMemo(()=>{
    const qu=q.trim().toLowerCase();
    if(!qu)return activeItems;
    return activeItems.filter(i=>
      i.name?.toLowerCase().includes(qu)||
      (i.nameEn||"").toLowerCase().includes(qu)||
      (i.sku||"").toLowerCase().includes(qu)||
      (i.barcode||"").includes(qu)
    );
  },[activeItems,q]);

  useEffect(()=>{
    const h=e=>{if(dropRef.current&&!dropRef.current.contains(e.target))setShowDrop(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  const selectItem=id=>{
    s("itemId",id);
    const found=activeItems.find(i=>(i._id||i.id)===id);
    setQ(found?(isAR?found.name:found.nameEn||found.name):"");
    setShowDrop(false);
    setBarcodeMsg("");
  };

  useEffect(()=>{
    if(prefillId){
      const found=items.find(i=>(i._id||i.id)===prefillId);
      if(found){setQ(isAR?found.name:found.nameEn||found.name);}
    }
  },[]);

  const onBarcodeDetect=async code=>{
    setScanning(false);
    setBarcodeMsg(isAR?"⏳ جارٍ البحث...":"⏳ Searching...");
    const found=activeItems.find(i=>i.barcode===code);
    if(found){selectItem(found._id||found.id);setBarcodeMsg(isAR?"✓ تم العثور على الصنف":"✓ Item found");return;}
    try{
      const r=await api.getByBarcode(code);
      if(r){
        const match=activeItems.find(i=>(i._id||i.id)===(r._id||r.id));
        if(match){selectItem(match._id||match.id);setBarcodeMsg(isAR?"✓ تم العثور على الصنف":"✓ Item found");return;}
      }
    }catch{}
    setBarcodeMsg(isAR?"❌ لم يُعثر على صنف بهذا الباركود":"❌ No item found for this barcode");
  };

  const submit=async()=>{
    if(!f.itemId||!f.qty)return;
    setSaving(true);
    try{await onSave({...f,qty:+f.qty});}
    finally{setSaving(false);}
  };

  return(
    <div>
      {scanning&&<BarcodeScanner t={t} lang={lang} onClose={()=>setScanning(false)} onDetect={onBarcodeDetect}/>}
      <div style={{display:"flex",background:C.surf2,borderRadius:R.md,padding:4,marginBottom:16,gap:4}}>
        {["IN","OUT"].map(tp=>(
          <button key={tp} type="button" onClick={()=>s("type",tp)}
            style={{flex:1,padding:"10px",borderRadius:R.sm,border:"none",cursor:"pointer",
              fontWeight:700,fontSize:13,fontFamily:"inherit",
              background:f.type===tp?(tp==="IN"?C.green:C.red):"transparent",
              color:f.type===tp?"#fff":C.tx2}}>
            {tp==="IN"?"↓ "+tx.in:"↑ "+tx.out}
          </button>
        ))}
      </div>
      <G2>
        <S2>
          <div style={{display:"flex",flexDirection:"column",gap:4}} ref={dropRef}>
            <label style={{fontSize:11.5,fontWeight:600,color:C.tx2}}>{tx.item}*</label>
            <div style={{display:"flex",gap:8}}>
              <div style={{position:"relative",flex:1}}>
                <input value={q}
                  onChange={e=>{setQ(e.target.value);setShowDrop(true);if(!e.target.value.trim())s("itemId","");}}
                  onFocus={()=>setShowDrop(true)}
                  placeholder={isAR?"ابحث بالاسم أو SKU أو الباركود...":"Search by name, SKU or barcode..."}
                  style={{...baseInput,width:"100%",boxSizing:"border-box",paddingInlineEnd:sel?"28px":undefined}}/>
                {sel&&<span style={{position:"absolute",insetInlineEnd:8,top:"50%",transform:"translateY(-50%)",
                  fontSize:12,color:C.green,pointerEvents:"none",fontWeight:700}}>✓</span>}
                {showDrop&&(
                  <div style={{position:"absolute",top:"100%",insetInlineStart:0,insetInlineEnd:0,zIndex:200,
                    background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:R.md,
                    boxShadow:SH.lg,maxHeight:220,overflowY:"auto",marginTop:2}}>
                    {filtered.length===0?(
                      <div style={{padding:"12px 14px",color:C.tx3,fontSize:12.5,textAlign:"center"}}>{t.noData}</div>
                    ):filtered.map(i=>(
                      <div key={i._id||i.id} onMouseDown={e=>{e.preventDefault();selectItem(i._id||i.id);}}
                        style={{padding:"9px 14px",cursor:"pointer",
                          borderBottom:`1px solid ${C.surf2}`,
                          background:(i._id||i.id)===f.itemId?C.primarySoft:"transparent",
                          display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {isAR?i.name:i.nameEn||i.name}
                          </div>
                          {i.sku&&<div style={{fontSize:10.5,color:C.tx3,fontFamily:"monospace"}}>{i.sku}</div>}
                        </div>
                        <div style={{fontSize:12,fontWeight:700,flexShrink:0,
                          color:i.qty<=0?C.red:i.qty<=i.minThreshold?C.amber:C.green}}>
                          {i.qty}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Btn color="ghost" size="sm" type="button" title={isAR?"مسح باركود":"Scan barcode"} onClick={()=>setScanning(true)}>📷</Btn>
            </div>
            {barcodeMsg&&<span style={{fontSize:12,color:barcodeMsg.includes("✓")?C.green:barcodeMsg.includes("⏳")?C.tx3:C.red}}>{barcodeMsg}</span>}
            {sel&&<div style={{background:C.surf2,borderRadius:R.sm,padding:"7px 10px",fontSize:12,
              color:C.tx2,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
              <span style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                📦 {isAR?sel.name:sel.nameEn||sel.name}
              </span>
              <span style={{fontWeight:700,flexShrink:0,color:sel.qty<=0?C.red:sel.qty<=sel.minThreshold?C.amber:C.green}}>
                {isAR?"المخزون":"Stock"}: {sel.qty}
              </span>
            </div>}
          </div>
        </S2>
        <Inp label={tx.qty+"*"} required type="number" min="1"
          max={f.type==="OUT"&&sel?sel.qty:undefined}
          value={f.qty} onChange={e=>s("qty",e.target.value)}/>
        <Inp label={tx.date+"*"} required type="date" value={f.date} onChange={e=>s("date",e.target.value)}/>
        <S2>
          <Inp label={f.type==="IN"?tx.source:tx.dest}
            value={f.type==="IN"?f.source:f.dest}
            onChange={e=>s(f.type==="IN"?"source":"dest",e.target.value)}
            placeholder={f.type==="IN"?"e.g. شركة التوريدات المتحدة":"e.g. مشروع خط التبريد"}/>
        </S2>
        <S2><Txt label={tx.notes} value={f.notes} onChange={e=>s("notes",e.target.value)} rows={2}/></S2>
      </G2>
      <div style={{background:C.surf2,borderRadius:R.sm,padding:"8px 12px",marginTop:8,fontSize:12,color:C.tx2}}>
        👤 {tx.user}: <strong>{currentUser.name}</strong>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
        <Btn color="ghost" onClick={onClose}>{t.cancel}</Btn>
        <Btn color={f.type==="IN"?"green":"primary"} onClick={submit} disabled={saving}>{saving?"⏳":t.save}</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════════════════

function Dashboard({stats,lang,t,currency,onNav}){
  const d=t.dash;
  const mobile=useMobile();
  const sym=getCurrencySymbol(currency||"USD");
  if(!stats)return <Spinner/>;
  const kpis=[
    {l:d.total,v:stats.totalItems,em:"📦",go:"inv"},
    {l:d.value,v:sym+money(stats.totalValue),em:"💰"},
    {l:d.low,v:(stats.lowStock||0)+(stats.outOfStock||0),em:"⚠️",warn:true,go:"inv"},
    {l:d.todayTx,v:stats.todayTransactions,em:"📋",go:"tx"},
  ];
  return(
    <div>
      {((stats.lowStock||0)+(stats.outOfStock||0))>0&&(
        <div style={{display:"flex",alignItems:"center",gap:10,background:C.amberSoft,
          border:`1px solid #fcd34d`,borderRadius:R.md,padding:"10px 14px",marginBottom:18,
          fontSize:13,color:C.amber,fontWeight:500}}>
          ⚠️ <strong>{(stats.lowStock||0)+(stats.outOfStock||0)}</strong> {t.lowAlert}
          <button onClick={()=>onNav("inv")} style={{marginInlineStart:"auto",background:C.surf,
            border:`1px solid ${C.bdr2}`,borderRadius:R.sm,padding:"4px 10px",
            fontSize:12,fontWeight:600,cursor:"pointer",color:C.tx}}>
            {t.nav.inv} →
          </button>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:mobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {kpis.map((k,i)=>(
          <div key={i} onClick={k.go?()=>onNav(k.go):undefined}
            style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:R.lg,
              padding:"18px 20px",cursor:k.go?"pointer":"default",boxShadow:SH.sm}}>
            <div style={{fontSize:28,marginBottom:8}}>{k.em}</div>
            <div style={{fontSize:10.5,fontWeight:600,color:C.tx3,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k.l}</div>
            <div style={{fontSize:24,fontWeight:800,color:k.warn&&k.v>0?C.red:C.tx}}>{k.v}</div>
          </div>
        ))}
      </div>
      <Card style={{overflow:"hidden"}}>
        <div style={{padding:"13px 16px",fontWeight:700,fontSize:14,borderBottom:`1px solid ${C.bdr}`}}>
          📋 {d.recent}
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead style={{background:C.surf2}}>
              <tr>{[t.tx.date,t.tx.type,t.inv.name,t.tx.qty,lang==="ar"?"المصدر/الوجهة":"Source/Dest",t.tx.user].map(h=>(
                <th key={h} style={{padding:"9px 14px",textAlign:"inherit",fontWeight:600,color:C.tx3,
                  fontSize:10.5,textTransform:"uppercase",borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {(stats.recentTx||[]).map(tx=>(
                <tr key={tx._id} style={{borderBottom:`1px solid ${C.surf2}`}}>
                  <td style={{padding:"10px 14px",color:C.tx3,fontSize:12}}>{new Date(tx.date).toLocaleDateString(lang==="ar"?"ar-EG":"en-GB")}</td>
                  <td style={{padding:"10px 14px"}}>
                    <span style={{background:tx.type==="IN"?C.greenSoft:C.redSoft,
                      color:tx.type==="IN"?C.green:C.red,padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700}}>
                      {tx.type==="IN"?t.inv.stockIn:t.inv.stockOut}
                    </span>
                  </td>
                  <td style={{padding:"10px 14px",fontWeight:600}}>{tx.itemId?.name||"—"}</td>
                  <td style={{padding:"10px 14px",fontFamily:"monospace"}}>{tx.qty}</td>
                  <td style={{padding:"10px 14px",color:C.tx2,fontSize:12}}>{tx.source||tx.dest||"—"}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:C.tx3}}>{tx.userName}</td>
                </tr>
              ))}
              {!(stats.recentTx?.length)&&<tr><td colSpan={6} style={{textAlign:"center",padding:30,color:C.tx3}}>{t.noData}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function InventoryPage({items,depts,cats,lang,t,perm,onAdd,onEdit,onDelete,onTx,onDetail,loading}){
  const inv=t.inv;
  const mobile=useMobile();
  const [search,setSearch]=useState("");
  const [deptF,setDeptF]=useState("all");
  const [stF,setStF]=useState("all");

  const filtered=useMemo(()=>{
    const q=search.toLowerCase();
    return items.filter(i=>{
      const matchQ=!q||i.name.toLowerCase().includes(q)||(i.nameEn||"").toLowerCase().includes(q)||(i.sku||"").toLowerCase().includes(q)||(i.barcode||"").includes(q);
      const dId=i.deptId?._id||i.deptId;
      const matchD=deptF==="all"||dId===deptF;
      const matchS=stF==="all"||(stF==="low"&&i.qty>0&&i.qty<=i.minThreshold)||(stF==="out"&&i.qty===0)||(stF==="ok"&&i.qty>i.minThreshold);
      return matchQ&&matchD&&matchS;
    });
  },[items,search,deptF,stF]);

  const{slice,page,total,setPg,perPage,setPerPage}=usePaginate(filtered,12);

  if(loading)return <Spinner/>;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:R.sm,padding:"7px 12px",flex:1,minWidth:160}}>
            🔍<input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}
              style={{border:"none",background:"none",outline:"none",fontSize:12.5,color:C.tx,width:"100%",fontFamily:"inherit"}}/>
          </div>
          {!mobile&&<select value={deptF} onChange={e=>setDeptF(e.target.value)} style={{...baseInput,width:"auto",padding:"7px 10px",fontSize:12.5}}>
            <option value="all">{inv.allDept}</option>
            {depts.map(d=><option key={d._id||d.id} value={d._id||d.id}>{lang==="ar"?d.name:d.nameEn||d.name}</option>)}
          </select>}
          {!mobile&&<select value={stF} onChange={e=>setStF(e.target.value)} style={{...baseInput,width:"auto",padding:"7px 10px",fontSize:12.5}}>
            <option value="all">{inv.allStatus}</option>
            <option value="ok">✅ {lang==="ar"?"متوفر":"In Stock"}</option>
            <option value="low">⚠️ {lang==="ar"?"منخفض":"Low"}</option>
            <option value="out">🔴 {lang==="ar"?"نفد":"Out"}</option>
          </select>}
        </div>
        <div style={{display:"flex",gap:8}}>
          {perm.canTx&&!mobile&&<Btn color="ghost" onClick={()=>onTx(null)}>↕ {t.tx.record}</Btn>}
          {perm.canAdd&&<Btn color="primary" onClick={onAdd}>＋ {mobile?"":inv.add}</Btn>}
        </div>
      </div>
      {mobile&&<div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <select value={deptF} onChange={e=>setDeptF(e.target.value)} style={{...baseInput,flex:1,padding:"7px 10px",fontSize:12}}>
          <option value="all">{inv.allDept}</option>
          {depts.map(d=><option key={d._id||d.id} value={d._id||d.id}>{lang==="ar"?d.name:d.nameEn||d.name}</option>)}
        </select>
        <select value={stF} onChange={e=>setStF(e.target.value)} style={{...baseInput,flex:1,padding:"7px 10px",fontSize:12}}>
          <option value="all">{inv.allStatus}</option>
          <option value="ok">✅ {lang==="ar"?"متوفر":"In Stock"}</option>
          <option value="low">⚠️ {lang==="ar"?"منخفض":"Low"}</option>
          <option value="out">🔴 {lang==="ar"?"نفد":"Out"}</option>
        </select>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(auto-fill,minmax(260px,1fr))",gap:mobile?10:14}}>
        {slice.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:48,color:C.tx3}}>{t.noData}</div>}
        {slice.map(item=>{
          const dept=depts.find(d=>(d._id||d.id)===(item.deptId?._id||item.deptId));
          const cat=cats.find(c=>(c._id||c.id)===(item.catId?._id||item.catId));
          const st=stOf(item);
          const stClr={ok:C.green,low:C.amber,out:C.red}[st];
          return(
            <Card key={item._id||item.id} style={{overflow:"hidden",display:"flex",flexDirection:"column",cursor:"pointer",transition:"box-shadow .15s"}}
              onClick={()=>onDetail(item)}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.13)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow=SH.sm}>
              <div style={{height:140,background:C.surf2,overflow:"hidden",position:"relative",flexShrink:0}}>
                {item.photo?(
                  <img src={item.photo.startsWith("/")?`http://localhost:5000${item.photo}`:item.photo}
                    alt={item.name} style={{width:"100%",height:"100%",objectFit:"contain",background:C.surf2}}
                    onError={e=>{e.target.style.display="none";}}/>
                ):(
                  <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,color:C.bdr2}}>📦</div>
                )}
                {dept&&<div style={{position:"absolute",top:8,insetInlineStart:8,background:dept.color,color:"#fff",padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:700}}>
                  {lang==="ar"?dept.name:dept.nameEn||dept.name}
                </div>}
                <div style={{position:"absolute",top:8,insetInlineEnd:8,width:10,height:10,borderRadius:99,background:stClr,boxShadow:"0 0 0 2px #fff"}}/>
              </div>
              <div style={{padding:14,flex:1,display:"flex",flexDirection:"column"}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:2,lineHeight:1.3}}>{lang==="ar"?item.name:item.nameEn||item.name}</div>
                {cat&&<div style={{fontSize:11,color:C.tx3,marginBottom:8}}>{lang==="ar"?cat.name:cat.nameEn||cat.name}</div>}
                {item.description&&<div style={{fontSize:12,color:C.tx3,marginBottom:10,lineHeight:1.5,flex:1}}>{item.description}</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
                  <div style={{background:C.surf2,borderRadius:R.sm,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.tx3,fontWeight:600}}>{lang==="ar"?"الكمية":"Qty"}</div>
                    <div style={{fontSize:16,fontWeight:800,color:stClr}}>{item.qty}</div>
                  </div>
                  <div style={{background:C.surf2,borderRadius:R.sm,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.tx3,fontWeight:600}}>{lang==="ar"?"السعر":"Price"}</div>
                    <div style={{fontSize:13,fontWeight:700}}>${money(item.price)}</div>
                  </div>
                  <div style={{background:C.surf2,borderRadius:R.sm,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.tx3,fontWeight:600}}>{t.types[item.type]||item.type}</div>
                    <div style={{fontSize:13,fontWeight:700,color:C.tx2}}>{item.sku||"—"}</div>
                  </div>
                </div>
                {item.minThreshold>0&&<div style={{marginBottom:10}}>
                  <Prog pct={Math.min(100,item.qty/Math.max(item.minThreshold*3,1)*100)} color={stClr} h={4}/>
                </div>}
                <div style={{fontSize:10.5,color:C.tx3,fontFamily:"monospace",marginBottom:10}}>{item.barcode||"no barcode"}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {perm.canTx&&<Btn color="ghost" size="sm" onClick={e=>{e.stopPropagation();onTx(item._id||item.id);}}>↕</Btn>}
                  {perm.canEdit&&<Btn color="ghost" size="sm" onClick={e=>{e.stopPropagation();onEdit(item);}}>✏️</Btn>}
                  {perm.canDelete&&<Btn color="red" size="sm" onClick={e=>{e.stopPropagation();onDelete(item._id||item.id);}}>🗑️</Btn>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Paginate page={page} total={total} setPg={setPg} perPage={perPage} setPerPage={setPerPage} totalItems={filtered?.length||0} t={t}/>
    </div>
  );
}

function TxPage({txs,items,depts,lang,t,perm,onRecord,onEditTx,onDeleteTx,loading}){
  const mobile=useMobile();
  const [typeF,setTypeF]=useState("all");
  const [search,setSearch]=useState("");
  const filtered=useMemo(()=>[...txs].sort((a,b)=>new Date(b.date)-new Date(a.date)).filter(tx=>{
    const q=search.toLowerCase();
    const name=(tx.itemId?.name||"").toLowerCase();
    return(!q||name.includes(q)||(tx.source||"").toLowerCase().includes(q)||(tx.dest||"").toLowerCase().includes(q))
      &&(typeF==="all"||tx.type===typeF);
  }),[txs,typeF,search]);
  const{slice,page,total,setPg,perPage,setPerPage}=usePaginate(filtered,20);
  const canAdmin=perm.canManageUsers;

  if(loading)return <Spinner/>;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:R.sm,padding:"7px 12px",flex:1,minWidth:180}}>
            🔍<input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}
              style={{border:"none",background:"none",outline:"none",fontSize:12.5,color:C.tx,width:"100%",fontFamily:"inherit"}}/>
          </div>
          <select value={typeF} onChange={e=>setTypeF(e.target.value)} style={{...baseInput,width:"auto",padding:"7px 10px",fontSize:12.5}}>
            <option value="all">{t.tx.allType}</option>
            <option value="IN">↓ {t.inv.stockIn}</option>
            <option value="OUT">↑ {t.inv.stockOut}</option>
          </select>
        </div>
        {perm.canTx&&<Btn color="primary" onClick={()=>onRecord(null)}>＋ {t.tx.record}</Btn>}
      </div>
      <Card style={{overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead style={{background:C.surf2}}>
              <tr>
                {[t.tx.date,t.tx.type,t.inv.name,t.tx.qty,lang==="ar"?"المصدر":"Source",lang==="ar"?"الوجهة":"Destination",t.tx.user,lang==="ar"?"ملاحظات":"Notes"].map(h=>(
                  <th key={h} style={{padding:"10px 13px",textAlign:"inherit",fontWeight:600,color:C.tx3,fontSize:10.5,textTransform:"uppercase",borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{h}</th>
                ))}
                {canAdmin&&<th style={{padding:"10px 13px",borderBottom:`1px solid ${C.bdr}`}}/>}
              </tr>
            </thead>
            <tbody>
              {slice.length===0&&<tr><td colSpan={canAdmin?9:8} style={{textAlign:"center",padding:40,color:C.tx3}}>{t.noData}</td></tr>}
              {slice.map(tx=>(
                <tr key={tx._id} style={{borderBottom:`1px solid ${C.surf2}`}}>
                  <td style={{padding:"11px 13px",color:C.tx3,fontSize:12,whiteSpace:"nowrap"}}>{new Date(tx.date).toLocaleDateString(lang==="ar"?"ar-EG":"en-GB")}</td>
                  <td style={{padding:"11px 13px"}}>
                    <span style={{background:tx.type==="IN"?C.greenSoft:C.redSoft,color:tx.type==="IN"?C.green:C.red,padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                      {tx.type==="IN"?"↓ "+t.inv.stockIn:"↑ "+t.inv.stockOut}
                    </span>
                  </td>
                  <td style={{padding:"11px 13px",fontWeight:600,whiteSpace:"nowrap"}}>{tx.itemId?.name||"—"}</td>
                  <td style={{padding:"11px 13px",fontFamily:"monospace"}}>{tx.qty}</td>
                  <td style={{padding:"11px 13px",color:C.tx2,fontSize:12}}>{tx.source||"—"}</td>
                  <td style={{padding:"11px 13px",color:C.tx2,fontSize:12}}>{tx.dest||"—"}</td>
                  <td style={{padding:"11px 13px",color:C.tx3,fontSize:12,whiteSpace:"nowrap"}}>👤 {tx.userName}</td>
                  <td style={{padding:"11px 13px",color:C.tx3,fontSize:12}}>{tx.notes||"—"}</td>
                  {canAdmin&&(
                    <td style={{padding:"8px 10px",whiteSpace:"nowrap"}}>
                      <div style={{display:"flex",gap:4}}>
                        <button title={t.tx.editTx} onClick={()=>onEditTx&&onEditTx(tx)}
                          style={{padding:"4px 8px",border:`1px solid ${C.bdr2}`,borderRadius:R.sm,background:C.surf,cursor:"pointer",fontSize:12,color:C.primary,fontFamily:"inherit"}}>✏️</button>
                        <button title={t.tx.deleteTx} onClick={()=>onDeleteTx&&onDeleteTx(tx._id||tx.id)}
                          style={{padding:"4px 8px",border:`1px solid ${C.redSoft}`,borderRadius:R.sm,background:C.redSoft,cursor:"pointer",fontSize:12,color:C.red,fontFamily:"inherit"}}>🗑</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Paginate page={page} total={total} setPg={setPg} perPage={perPage} setPerPage={setPerPage} totalItems={filtered?.length||0} t={t}/>
    </div>
  );
}

function DeptPage({depts,cats,items,lang,t,perm,onAddDept,onDelDept,onAddCat,onDelCat}){
  const dt=t.dept;
  const tablet=useTablet();
  const [dName,setDName]=useState("");const[dColor,setDColor]=useState("#3b82f6");
  const [cName,setCName]=useState("");const[cDept,setCDept]=useState("");
  return(
    <div style={{display:"grid",gridTemplateColumns:tablet?"1fr":"1fr 1fr",gap:20}}>
      <div>
        <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>{lang==="ar"?"الأقسام":"Departments"}</div>
        {perm.canManageDepts&&<Card style={{padding:16,marginBottom:14}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>{dt.addDept}</div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <input value={dName} onChange={e=>setDName(e.target.value)} placeholder={dt.deptName} style={{...baseInput,flex:1}}/>
            <input type="color" value={dColor} onChange={e=>setDColor(e.target.value)} style={{width:42,height:42,border:`1px solid ${C.bdr}`,borderRadius:R.sm,cursor:"pointer",padding:2}}/>
          </div>
          <Btn color="primary" size="sm" onClick={()=>{if(!dName.trim())return;onAddDept({name:dName,nameEn:dName,color:dColor});setDName("");}}>＋ {dt.addDept}</Btn>
        </Card>}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {depts.map(d=>{
            const count=items.filter(i=>(i.deptId?._id||i.deptId)===(d._id||d.id)).length;
            return(<Card key={d._id||d.id} style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:12,height:12,borderRadius:99,background:d.color,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{lang==="ar"?d.name:d.nameEn||d.name}</div>
                <div style={{fontSize:11,color:C.tx3}}>{count} {lang==="ar"?"صنف":"items"}</div>
              </div>
              {perm.canManageDepts&&count===0&&<button onClick={()=>onDelDept(d._id||d.id)}
                style={{background:C.redSoft,border:"none",borderRadius:R.sm,padding:"4px 8px",cursor:"pointer",color:C.red,fontSize:12}}>🗑️</button>}
            </Card>);
          })}
        </div>
      </div>
      <div>
        <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>{lang==="ar"?"التصنيفات":"Categories"}</div>
        {perm.canManageDepts&&<Card style={{padding:16,marginBottom:14}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>{dt.addCat}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <select value={cDept} onChange={e=>setCDept(e.target.value)} style={baseInput}>
              <option value="">--</option>
              {depts.map(d=><option key={d._id||d.id} value={d._id||d.id}>{lang==="ar"?d.name:d.nameEn||d.name}</option>)}
            </select>
            <input value={cName} onChange={e=>setCName(e.target.value)} placeholder={dt.catName} style={baseInput}/>
            <Btn color="primary" size="sm" onClick={()=>{if(!cName.trim()||!cDept)return;onAddCat({deptId:cDept,name:cName,nameEn:cName});setCName("");}}>＋ {dt.addCat}</Btn>
          </div>
        </Card>}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {cats.map(c=>{
            const dept=depts.find(d=>(d._id||d.id)===(c.deptId?._id||c.deptId));
            const count=items.filter(i=>(i.catId?._id||i.catId)===(c._id||c.id)).length;
            return(<Card key={c._id||c.id} style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
              {dept&&<div style={{width:8,height:8,borderRadius:99,background:dept.color,flexShrink:0}}/>}
              <div style={{flex:1}}>
                <div style={{fontWeight:500,fontSize:13}}>{lang==="ar"?c.name:c.nameEn||c.name}</div>
                <div style={{fontSize:11,color:C.tx3}}>{dept?(lang==="ar"?dept.name:dept.nameEn||dept.name):"—"} · {count} {lang==="ar"?"صنف":"items"}</div>
              </div>
              {perm.canManageDepts&&count===0&&<button onClick={()=>onDelCat(c._id||c.id)}
                style={{background:C.redSoft,border:"none",borderRadius:R.sm,padding:"3px 7px",cursor:"pointer",color:C.red,fontSize:12}}>🗑️</button>}
            </Card>);
          })}
        </div>
      </div>
    </div>
  );
}

function UserEditModal({user,t,onSave,onClose}){
  const ut=t.users;
  const roleBase=ROLE_PERMS[user.role]||ROLE_PERMS.viewer;
  const [f,setF]=useState({
    name:user.name||"",nameEn:user.nameEn||"",email:user.email||"",
    role:user.role||"viewer",password:"",
    permissions:{...roleBase,...(user.permissions||{})}
  });
  const[saving,setSaving]=useState(false);
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const sp=(k,v)=>setF(p=>({...p,permissions:{...p.permissions,[k]:v}}));

  useEffect(()=>{
    const base=ROLE_PERMS[f.role]||ROLE_PERMS.viewer;
    setF(p=>({...p,permissions:{...base,...(user.permissions||{})}}));
  },[f.role]);

  const submit=async()=>{
    if(!f.name.trim())return;
    setSaving(true);
    const payload={name:f.name,nameEn:f.nameEn,email:f.email,role:f.role,permissions:f.permissions};
    if(f.password.trim())payload.password=f.password;
    try{await onSave(user._id||user.id,payload);}finally{setSaving(false);}
  };

  return(
    <ModalShell title={ut.edit} onClose={onClose}>
      <G2>
        <Inp label={ut.name+"*"} value={f.name} onChange={e=>s("name",e.target.value)}/>
        <Inp label="Username" value={user.username} disabled style={{opacity:.6}}/>
        <Inp label={ut.email} value={f.email} onChange={e=>s("email",e.target.value)} placeholder="user@example.com"/>
        <Inp label={ut.newPass} type="password" value={f.password} onChange={e=>s("password",e.target.value)} placeholder="••••••••"/>
        <S2>
          <Sel label={ut.role} value={f.role} onChange={e=>s("role",e.target.value)}>
            {Object.entries(t.users.roles).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </Sel>
        </S2>
      </G2>
      <div style={{marginTop:16,padding:14,background:C.surf2,borderRadius:R.md}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>🔑 {ut.permsTitle}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {PERM_KEYS.map(k=>(
            <label key={k} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,padding:"6px 8px",borderRadius:R.sm,background:f.permissions[k]?C.greenSoft:C.redSoft,border:`1px solid ${f.permissions[k]?"#86efac":"#fca5a5"}`}}>
              <input type="checkbox" checked={!!f.permissions[k]} onChange={e=>sp(k,e.target.checked)} style={{width:15,height:15,cursor:"pointer"}}/>
              <span style={{color:f.permissions[k]?C.green:C.red,fontWeight:600}}>{ut.permLabels[k]}</span>
            </label>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
        <Btn color="ghost" onClick={onClose}>{t.cancel}</Btn>
        <Btn color="primary" onClick={submit} disabled={saving}>{saving?"⏳":t.save}</Btn>
      </div>
    </ModalShell>
  );
}

function UsersPage({users,currentUser,txs,lang,t,perm,onAdd,onUpdate,onToggle,onDelete}){
  const ut=t.users;
  const mobile=useMobile();
  const [showAdd,setShowAdd]=useState(false);
  const [editUser,setEditUser]=useState(null);
  const [viewUser,setViewUser]=useState(null);
  const [f,setF]=useState({name:"",nameEn:"",email:"",username:"",password:"",role:"warehouse"});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const{slice,page,total,setPg,perPage,setPerPage}=usePaginate(users,12);

  const roleColors={admin:{bg:"#ede9fe",tx:"#5b21b6"},manager:{bg:C.primarySoft,tx:C.primary},warehouse:{bg:C.greenSoft,tx:C.green},viewer:{bg:"#f1f5f9",tx:C.tx2}};

  if(viewUser){
    const u=users.find(x=>(x._id||x.id)===(viewUser._id||viewUser.id))||viewUser;
    const userTxs=txs.filter(tx=>(tx.userId===( u._id||u.id)||tx.userName===u.name));
    const perms=resolvePerms(u);
    return(
      <div>
        <button onClick={()=>setViewUser(null)} style={{display:"flex",alignItems:"center",gap:5,background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:R.sm,padding:"6px 12px",cursor:"pointer",fontSize:13,fontWeight:600,color:C.tx2,fontFamily:"inherit",marginBottom:20}}>
          {lang==="ar"?"→ ":"← "}{ut.title}
        </button>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"280px 1fr",gap:20,alignItems:"start"}}>
          <div>
            <Card style={{padding:20,marginBottom:14,textAlign:"center"}}>
              <div style={{width:72,height:72,borderRadius:99,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:28,margin:"0 auto 12px"}}>
                {u.name.charAt(0)}
              </div>
              <div style={{fontWeight:800,fontSize:17,marginBottom:2}}>{u.name}</div>
              {u.nameEn&&<div style={{fontSize:13,color:C.tx3,marginBottom:8}}>{u.nameEn}</div>}
              <div style={{fontSize:12,color:C.tx3,fontFamily:"monospace",marginBottom:8}}>@{u.username}</div>
              {u.email&&<div style={{fontSize:12,color:C.tx3,marginBottom:10}}>✉️ {u.email}</div>}
              <span style={{background:roleColors[u.role]?.bg||"#f1f5f9",color:roleColors[u.role]?.tx||C.tx2,padding:"3px 12px",borderRadius:99,fontSize:12,fontWeight:700}}>
                {t.users.roles[u.role]||u.role}
              </span>
              <div style={{marginTop:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <div style={{width:8,height:8,borderRadius:99,background:u.active?C.green:C.red}}/>
                <span style={{fontSize:12,color:u.active?C.green:C.red}}>{u.active?(lang==="ar"?"نشط":"Active"):(lang==="ar"?"معطل":"Inactive")}</span>
              </div>
              {u.createdAt&&<div style={{fontSize:11,color:C.tx3,marginTop:8}}>📅 {ut.joinedOn}: {new Date(u.createdAt).toLocaleDateString()}</div>}
            </Card>
            <Card style={{padding:"12px 16px",marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>📊 {ut.txCount}</div>
              <div style={{fontSize:28,fontWeight:800,color:C.primary,textAlign:"center"}}>{userTxs.length}</div>
            </Card>
            {perm.canManageUsers&&(u._id||u.id)!==(currentUser._id||currentUser.id)&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <Btn color="primary" full onClick={()=>setEditUser(u)}>✏️ {ut.edit}</Btn>
                <Btn color="ghost" full onClick={()=>onToggle(u._id||u.id,!u.active)}>
                  {u.active?"⏸ "+ut.inactive:"▶ "+ut.active}
                </Btn>
                <Btn color="red" full onClick={()=>{onDelete(u._id||u.id);setViewUser(null);}}>🗑️ {t.delete}</Btn>
              </div>
            )}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card style={{padding:20}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🔑 {ut.permsTitle}</div>
              <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:8}}>
                {PERM_KEYS.map(k=>(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:R.sm,background:perms[k]?C.greenSoft:C.surf2,border:`1px solid ${perms[k]?"#86efac":C.bdr}`}}>
                    <span style={{fontSize:16}}>{perms[k]?"✅":"❌"}</span>
                    <span style={{fontSize:13,fontWeight:600,color:perms[k]?C.green:C.tx3}}>{ut.permLabels[k]}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{overflow:"hidden"}}>
              <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:`1px solid ${C.bdr}`}}>📋 {lang==="ar"?"آخر الحركات":"Recent Transactions"}</div>
              {userTxs.length===0?(
                <div style={{padding:24,textAlign:"center",color:C.tx3,fontSize:13}}>{t.noData}</div>
              ):(
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
                    <thead style={{background:C.surf2}}>
                      <tr>{[t.tx.date,t.tx.type,t.inv.name,t.tx.qty].map(h=>(
                        <th key={h} style={{padding:"8px 12px",textAlign:"inherit",fontWeight:600,color:C.tx3,fontSize:10.5,textTransform:"uppercase",borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {userTxs.slice(0,20).map(tx=>(
                        <tr key={tx._id} style={{borderBottom:`1px solid ${C.surf2}`}}>
                          <td style={{padding:"9px 12px",color:C.tx3,fontSize:11.5}}>{new Date(tx.date).toLocaleDateString()}</td>
                          <td style={{padding:"9px 12px"}}>
                            <span style={{background:tx.type==="IN"?C.greenSoft:C.redSoft,color:tx.type==="IN"?C.green:C.red,padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700}}>
                              {tx.type==="IN"?"↓":"↑"} {tx.type}
                            </span>
                          </td>
                          <td style={{padding:"9px 12px",fontWeight:600}}>{tx.itemId?.name||"—"}</td>
                          <td style={{padding:"9px 12px",fontFamily:"monospace"}}>{tx.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
        {editUser&&<UserEditModal user={editUser} t={t} onClose={()=>setEditUser(null)} onSave={async(id,d)=>{await onUpdate(id,d);setEditUser(null);const updated=users.find(x=>(x._id||x.id)===id);if(updated)setViewUser({...updated,...d});}}/>}
      </div>
    );
  }

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15}}>{ut.title} ({users.length})</div>
        {perm.canManageUsers&&<Btn color="primary" onClick={()=>setShowAdd(!showAdd)}>{showAdd?"✕":("＋ "+ut.add)}</Btn>}
      </div>
      {showAdd&&<Card style={{padding:20,marginBottom:16}}>
        <G2>
          <Inp label={ut.name+"*"} value={f.name} onChange={e=>s("name",e.target.value)}/>
          <Inp label="Username*" value={f.username} onChange={e=>s("username",e.target.value)}/>
          <Inp label={ut.email} value={f.email} onChange={e=>s("email",e.target.value)} placeholder="user@example.com"/>
          <Inp label="Password*" type="password" value={f.password} onChange={e=>s("password",e.target.value)}/>
          <S2>
            <Sel label={ut.role} value={f.role} onChange={e=>s("role",e.target.value)}>
              {Object.entries(t.users.roles).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </Sel>
          </S2>
        </G2>
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <Btn color="ghost" onClick={()=>setShowAdd(false)}>{t.cancel}</Btn>
          <Btn color="primary" onClick={async()=>{
            if(!f.name||!f.username||!f.password)return;
            await onAdd(f);setF({name:"",nameEn:"",email:"",username:"",password:"",role:"warehouse"});setShowAdd(false);
          }}>{t.save}</Btn>
        </div>
      </Card>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {slice.map(u=>(
          <Card key={u._id||u.id} style={{padding:18,cursor:"pointer",transition:"box-shadow .15s"}}
            onClick={()=>setViewUser(u)}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=SH.sm}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:99,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:17,flexShrink:0}}>
                {u.name.charAt(0)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
                <div style={{fontSize:11.5,color:C.tx3,fontFamily:"monospace"}}>@{u.username}</div>
                {u.email&&<div style={{fontSize:11,color:C.tx3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>✉️ {u.email}</div>}
              </div>
              <div style={{width:8,height:8,borderRadius:99,background:u.active?C.green:C.red,flexShrink:0}}/>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{background:roleColors[u.role]?.bg||"#f1f5f9",color:roleColors[u.role]?.tx||C.tx2,padding:"2px 10px",borderRadius:99,fontSize:11,fontWeight:700}}>
                {t.users.roles[u.role]||u.role}
              </span>
              <span style={{fontSize:11,color:C.tx3}}>{txs.filter(tx=>tx.userName===u.name).length} {lang==="ar"?"حركة":"txs"}</span>
            </div>
          </Card>
        ))}
      </div>
      <Paginate page={page} total={total} setPg={setPg} perPage={perPage} setPerPage={setPerPage} totalItems={users.length} t={t}/>
      {editUser&&<UserEditModal user={editUser} t={t} onClose={()=>setEditUser(null)} onSave={async(id,d)=>{await onUpdate(id,d);setEditUser(null);}}/>}
    </div>
  );
}

// ── User Profile Page (own profile) ──────────────────────────────────────────
function UserProfilePage({currentUser,txs,lang,t,perm}){
  const mobile=useMobile();
  const pr=t.profile;
  const ut=t.users;
  const myTxs=txs.filter(tx=>tx.userName===currentUser.name||tx.userId===(currentUser._id||currentUser.id));
  const perms=resolvePerms(currentUser);
  const{slice,page,total,setPg,perPage,setPerPage}=usePaginate(myTxs,15);
  return(
    <div>
      <div style={{fontWeight:700,fontSize:16,marginBottom:20}}>👤 {pr.title}</div>
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"280px 1fr",gap:20,alignItems:"start"}}>
        <div>
          <Card style={{padding:24,textAlign:"center",marginBottom:14}}>
            <div style={{width:80,height:80,borderRadius:99,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:32,margin:"0 auto 14px"}}>
              {currentUser.name.charAt(0)}
            </div>
            <div style={{fontWeight:800,fontSize:18,marginBottom:4}}>{currentUser.name}</div>
            {currentUser.nameEn&&<div style={{fontSize:13,color:C.tx3,marginBottom:6}}>{currentUser.nameEn}</div>}
            <div style={{fontSize:12.5,color:C.tx3,fontFamily:"monospace",marginBottom:6}}>@{currentUser.username}</div>
            {currentUser.email&&<div style={{fontSize:12,color:C.tx3,marginBottom:12}}>✉️ {currentUser.email}</div>}
            <span style={{background:C.primarySoft,color:C.primary,padding:"4px 14px",borderRadius:99,fontSize:12,fontWeight:700}}>
              {t.users.roles[currentUser.role]||currentUser.role}
            </span>
          </Card>
          <Card style={{padding:16,marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:14}}>📊 {lang==="ar"?"إحصائياتي":"My Stats"}</div>
            {[
              [lang==="ar"?"إجمالي الحركات":"Total Transactions",myTxs.length,C.primary],
              [lang==="ar"?"حركات وارد":"Stock IN",myTxs.filter(x=>x.type==="IN").length,C.green],
              [lang==="ar"?"حركات صادر":"Stock OUT",myTxs.filter(x=>x.type==="OUT").length,C.red],
            ].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.bdr}`}}>
                <span style={{fontSize:13,color:C.tx2}}>{l}</span>
                <span style={{fontSize:16,fontWeight:800,color:c}}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{padding:20}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🔑 {pr.myPerms}</div>
            <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:8}}>
              {PERM_KEYS.map(k=>(
                <div key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:R.sm,background:perms[k]?C.greenSoft:C.surf2,border:`1px solid ${perms[k]?"#86efac":C.bdr}`}}>
                  <span style={{fontSize:16}}>{perms[k]?"✅":"❌"}</span>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:600,color:perms[k]?C.green:C.tx3}}>{ut.permLabels[k]}</div>
                    <div style={{fontSize:11,color:C.tx3}}>{perms[k]?pr.allowed:pr.denied}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{overflow:"hidden"}}>
            <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:`1px solid ${C.bdr}`}}>📋 {lang==="ar"?"حركاتي":"My Transactions"} ({myTxs.length})</div>
            {myTxs.length===0?(
              <div style={{padding:32,textAlign:"center",color:C.tx3}}>{t.noData}</div>
            ):(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
                  <thead style={{background:C.surf2}}>
                    <tr>{[t.tx.date,t.tx.type,t.inv.name,t.tx.qty,lang==="ar"?"ملاحظات":"Notes"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",textAlign:"inherit",fontWeight:600,color:C.tx3,fontSize:10.5,textTransform:"uppercase",borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {slice.map(tx=>(
                      <tr key={tx._id} style={{borderBottom:`1px solid ${C.surf2}`}}>
                        <td style={{padding:"9px 12px",color:C.tx3,fontSize:11.5,whiteSpace:"nowrap"}}>{new Date(tx.date).toLocaleDateString()}</td>
                        <td style={{padding:"9px 12px"}}>
                          <span style={{background:tx.type==="IN"?C.greenSoft:C.redSoft,color:tx.type==="IN"?C.green:C.red,padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700}}>
                            {tx.type==="IN"?"↓ IN":"↑ OUT"}
                          </span>
                        </td>
                        <td style={{padding:"9px 12px",fontWeight:600}}>{tx.itemId?.name||"—"}</td>
                        <td style={{padding:"9px 12px",fontFamily:"monospace"}}>{tx.qty}</td>
                        <td style={{padding:"9px 12px",color:C.tx3,fontSize:11.5}}>{tx.notes||"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{padding:"8px 16px"}}><Paginate page={page} total={total} setPg={setPg} perPage={perPage} setPerPage={setPerPage} totalItems={myTxs.length} t={t}/></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Item Detail Page ──────────────────────────────────────────────────────────
function ItemDetailPage({item,depts,cats,txs,lang,t,perm,currency,onBack,onEdit,onTx}){
  const mobile=useMobile();
  const tablet=useTablet();
  const isAR=lang==="ar";
  const sym=getCurrencySymbol(currency);
  const dept=depts.find(d=>(d._id||d.id)===(item.deptId?._id||item.deptId));
  const cat=cats.find(c=>(c._id||c.id)===(item.catId?._id||item.catId));
  const itemTxs=[...txs].filter(tx=>(tx.itemId?._id||tx.itemId)===(item._id||item.id)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const{slice:txSlice,page:txPg,total:txTotal,setPg:setTxPg,perPage:txPP,setPerPage:setTxPP}=usePaginate(itemTxs,10);
  const inQty=itemTxs.filter(tx=>tx.type==="IN").reduce((s,tx)=>s+tx.qty,0);
  const outQty=itemTxs.filter(tx=>tx.type==="OUT").reduce((s,tx)=>s+tx.qty,0);
  const st=stOf(item);
  const stClr={ok:C.green,low:C.amber,out:C.red}[st];
  const stLabel={ok:isAR?"متوفر":"In Stock",low:isAR?"منخفض":"Low Stock",out:isAR?"نفد":"Out of Stock"}[st];

  // Build image list: images array takes priority, fallback to photo field
  const allImgs=item.images?.length>0?item.images
    :item.photo?[{url:item.photo.startsWith("/")?`http://localhost:5000${item.photo}`:item.photo,publicId:""}]:[];
  const [imgIdx,setImgIdx]=useState(0);
  const safeIdx=Math.min(imgIdx,Math.max(0,allImgs.length-1));

  return(
    <div>
      {/* Breadcrumb */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:5,background:C.surf,
          border:`1px solid ${C.bdr2}`,borderRadius:R.sm,padding:"6px 12px",cursor:"pointer",
          fontSize:13,fontWeight:600,color:C.tx2,fontFamily:"inherit",flexShrink:0}}>
          {lang==="ar"?"→ ":"← "}{t.nav.inv}
        </button>
        <span style={{color:C.tx3,flexShrink:0}}>/</span>
        <span style={{fontWeight:700,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{lang==="ar"?item.name:item.nameEn||item.name}</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:tablet?"1fr":"300px 1fr",gap:16,alignItems:"start"}}>
        {/* Left column */}
        <div>
          <Card style={{overflow:"hidden",marginBottom:12}}>
            {/* Main image */}
            <div style={{height:mobile?200:280,background:C.surf2,position:"relative"}}>
              {allImgs.length>0?(
                <img src={allImgs[safeIdx].url} alt={item.name}
                  style={{width:"100%",height:"100%",objectFit:"contain",background:C.surf2}}
                  onError={e=>{e.target.style.display="none";}}/>
              ):(
                <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:mobile?48:64,color:C.bdr2}}>📦</div>
              )}
              {allImgs.length>1&&<>
                <button onClick={()=>setImgIdx(i=>Math.max(0,i-1))} disabled={safeIdx===0}
                  style={{position:"absolute",top:"50%",insetInlineStart:6,transform:"translateY(-50%)",background:"rgba(0,0,0,.45)",border:"none",color:"#fff",borderRadius:99,width:30,height:30,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                <button onClick={()=>setImgIdx(i=>Math.min(allImgs.length-1,i+1))} disabled={safeIdx===allImgs.length-1}
                  style={{position:"absolute",top:"50%",insetInlineEnd:6,transform:"translateY(-50%)",background:"rgba(0,0,0,.45)",border:"none",color:"#fff",borderRadius:99,width:30,height:30,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
                <div style={{position:"absolute",bottom:6,insetInlineEnd:8,background:"rgba(0,0,0,.55)",color:"#fff",fontSize:10.5,fontWeight:700,padding:"2px 8px",borderRadius:99}}>{safeIdx+1}/{allImgs.length}</div>
              </>}
              <div style={{position:"absolute",bottom:8,insetInlineStart:8,background:stClr,color:"#fff",
                padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700}}>{stLabel}</div>
              {dept&&<div style={{position:"absolute",top:8,insetInlineStart:8,background:dept.color,color:"#fff",
                padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:700}}>
                {isAR?dept.name:dept.nameEn||dept.name}
              </div>}
            </div>
            {/* Thumbnail strip */}
            {allImgs.length>1&&<div style={{display:"flex",gap:6,padding:"8px 10px",overflowX:"auto",background:C.surf2,borderTop:`1px solid ${C.bdr}`}}>
              {allImgs.map((img,i)=>(
                <div key={i} onClick={()=>setImgIdx(i)}
                  style={{width:46,height:46,borderRadius:R.sm,overflow:"hidden",flexShrink:0,cursor:"pointer",
                    border:`2px solid ${i===safeIdx?C.primary:C.bdr}`,background:C.surf}}>
                  <img src={img.url} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{e.target.style.display="none";}}/>
                </div>
              ))}
            </div>}
          </Card>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[
              [isAR?"الكمية":"Stock",item.qty,stClr],
              [isAR?"الحد الأدنى":"Min",item.minThreshold,C.amber],
              [isAR?"وارد":"IN",inQty,C.green],
              [isAR?"صادر":"OUT",outQty,C.red],
              [isAR?"السعر":"Price",sym+money(item.price),C.tx],
              [isAR?"القيمة":"Value",sym+money(item.qty*item.price),C.primary],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:C.surf2,border:`1px solid ${C.bdr}`,borderRadius:R.sm,padding:mobile?"8px 10px":"10px 12px"}}>
                <div style={{fontSize:9,fontWeight:600,color:C.tx3,textTransform:"uppercase",letterSpacing:.4,marginBottom:2}}>{l}</div>
                <div style={{fontSize:mobile?14:17,fontWeight:800,color:c}}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:8,flexDirection:mobile?"row":"column"}}>
            {perm.canTx&&<Btn color="primary" full onClick={()=>onTx(item._id||item.id)}>↕ {t.tx.record}</Btn>}
            {perm.canEdit&&<Btn color="ghost" full onClick={()=>onEdit(item)}>✏️ {t.inv.edit}</Btn>}
          </div>
        </div>

        {/* Right column */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{padding:mobile?14:20}}>
            <div style={{fontWeight:700,fontSize:mobile?14:15,marginBottom:4}}>{item.name}</div>
            {item.nameEn&&<div style={{fontSize:13,color:C.tx3,marginBottom:12}}>{item.nameEn}</div>}
            <div style={{height:1,background:C.bdr,marginBottom:12}}/>
            <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:8}}>
              {[
                ["SKU",item.sku||"—","monospace"],
                [isAR?"الباركود":"Barcode",item.barcode||"—","monospace"],
                [isAR?"القسم":"Department",dept?(isAR?dept.name:dept.nameEn||dept.name):"—",null],
                [isAR?"التصنيف":"Category",cat?(isAR?cat.name:cat.nameEn||cat.name):"—",null],
                [isAR?"نوع التعبئة":"Package Type",t.types[item.type]||item.type,null],
                [isAR?"الحالة":"Status",t.status[item.status]||item.status,null],
                ...(item.datasheet?[[t.inv.datasheet,item.datasheet,"monospace"]]:[]),
                ...(item.unitsPerPackage>1&&item.type!=="unit"?[[t.inv.unitsPerPkg,`${item.unitsPerPackage} ${isAR?"وحدة":"units"}`,null]]:[]),
              ].map(([label,value,ff])=>(
                <div key={label} style={{background:C.surf2,borderRadius:R.sm,padding:"9px 11px"}}>
                  <div style={{fontSize:10,color:C.tx3,fontWeight:600,marginBottom:3}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx,fontFamily:ff||"inherit",wordBreak:"break-all"}}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,padding:12,background:C.surf2,borderRadius:R.sm}}>
              <div style={{fontSize:10.5,color:C.tx3,fontWeight:600,marginBottom:4}}>{lang==="ar"?"الوصف":"Description"}</div>
              {item.description?(
                <p style={{fontSize:13,color:C.tx2,lineHeight:1.6,margin:0}}>{item.description}</p>
              ):(
                <p style={{fontSize:12.5,color:C.tx3,fontStyle:"italic",margin:0}}>
                  {lang==="ar"?"لا يوجد وصف — أضف وصفاً عند تعديل الصنف أو عبر بحث الباركود":"No description — add one by editing the item or via barcode lookup"}
                </p>
              )}
            </div>
          </Card>

          <Card style={{overflow:"hidden"}}>
            <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>📋 {lang==="ar"?"سجل الحركات":"Transaction History"}</span>
              <span style={{background:C.surf2,border:`1px solid ${C.bdr}`,borderRadius:99,padding:"2px 10px",fontSize:12,fontWeight:700,color:C.tx2}}>{itemTxs.length}</span>
            </div>
            {itemTxs.length===0?(
              <div style={{padding:32,textAlign:"center",color:C.tx3,fontSize:13}}>{t.noData}</div>
            ):mobile?(
              /* Mobile: card list instead of table */
              <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:8}}>
                {txSlice.map(tx=>(
                  <div key={tx._id} style={{background:C.surf2,borderRadius:R.sm,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                    <span style={{background:tx.type==="IN"?C.greenSoft:C.redSoft,color:tx.type==="IN"?C.green:C.red,
                      padding:"3px 8px",borderRadius:99,fontSize:11,fontWeight:700,flexShrink:0}}>
                      {tx.type==="IN"?"↓ IN":"↑ OUT"}
                    </span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{tx.source||tx.dest||"—"}</div>
                      <div style={{fontSize:11,color:C.tx3}}>{new Date(tx.date).toLocaleDateString()} · 👤 {tx.userName}</div>
                    </div>
                    <div style={{fontSize:16,fontWeight:800,color:tx.type==="IN"?C.green:C.red,flexShrink:0}}>×{tx.qty}</div>
                  </div>
                ))}
              </div>
            ):(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
                  <thead style={{background:C.surf2}}>
                    <tr>{[t.tx.date,t.tx.type,t.tx.qty,lang==="ar"?"المصدر/الوجهة":"Source/Dest",t.tx.user,lang==="ar"?"ملاحظات":"Notes"].map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:"inherit",fontWeight:600,color:C.tx3,fontSize:10.5,textTransform:"uppercase",borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {txSlice.map(tx=>(
                      <tr key={tx._id} style={{borderBottom:`1px solid ${C.surf2}`}}>
                        <td style={{padding:"10px 12px",color:C.tx3,fontSize:11.5,whiteSpace:"nowrap"}}>{new Date(tx.date).toLocaleDateString(lang==="ar"?"ar-EG":"en-GB")}</td>
                        <td style={{padding:"10px 12px"}}>
                          <span style={{background:tx.type==="IN"?C.greenSoft:C.redSoft,color:tx.type==="IN"?C.green:C.red,padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                            {tx.type==="IN"?"↓ "+t.inv.stockIn:"↑ "+t.inv.stockOut}
                          </span>
                        </td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:700}}>{tx.qty}</td>
                        <td style={{padding:"10px 12px",color:C.tx2,fontSize:12}}>{tx.source||tx.dest||"—"}</td>
                        <td style={{padding:"10px 12px",color:C.tx3,fontSize:11.5,whiteSpace:"nowrap"}}>👤 {tx.userName}</td>
                        <td style={{padding:"10px 12px",color:C.tx3,fontSize:11.5}}>{tx.notes||"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {itemTxs.length>0&&<div style={{padding:"8px 12px 12px"}}>
              <Paginate page={txPg} total={txTotal} setPg={setTxPg} perPage={txPP} setPerPage={setTxPP} t={t} totalItems={itemTxs.length}/>
            </div>}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Transaction Edit Modal (admin) ────────────────────────────────────────────
function TxEditModal({tx,items,t,lang,onSave,onClose}){
  const isAR=lang==="ar";
  const [f,setF]=useState({
    type:tx.type,qty:tx.qty,
    source:tx.source||"",dest:tx.dest||"",
    date:tx.date?new Date(tx.date).toISOString().split("T")[0]:today(),
    notes:tx.notes||""
  });
  const [saving,setSaving]=useState(false);
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const txItem=items.find(i=>(i._id||i.id)===(tx.itemId?._id||tx.itemId));
  const submit=async()=>{
    if(!f.qty)return;
    setSaving(true);
    try{await onSave(tx._id,{...f,qty:+f.qty});}finally{setSaving(false);}
  };
  return(
    <ModalShell title={t.tx.editTx} onClose={onClose}>
      <div style={{background:C.primarySoft,borderRadius:R.sm,padding:"8px 12px",marginBottom:14,fontSize:13,color:C.tx2}}>
        📦 {isAR?txItem?.name:txItem?.nameEn||txItem?.name||"—"}
      </div>
      <G2>
        <S2>
          <div style={{display:"flex",background:C.surf2,borderRadius:R.md,padding:4,gap:4}}>
            {["IN","OUT"].map(tp=>(
              <button key={tp} type="button" onClick={()=>s("type",tp)}
                style={{flex:1,padding:"9px",borderRadius:R.sm,border:"none",cursor:"pointer",
                  fontWeight:700,fontSize:13,fontFamily:"inherit",
                  background:f.type===tp?(tp==="IN"?C.green:C.red):"transparent",
                  color:f.type===tp?"#fff":C.tx2}}>
                {tp==="IN"?"↓ "+t.inv.stockIn:"↑ "+t.inv.stockOut}
              </button>
            ))}
          </div>
        </S2>
        <Inp label={t.tx.qty+"*"} type="number" min="1" value={f.qty} onChange={e=>s("qty",e.target.value)}/>
        <Inp label={t.tx.date+"*"} type="date" value={f.date} onChange={e=>s("date",e.target.value)}/>
        <Inp label={t.tx.source} value={f.source} onChange={e=>s("source",e.target.value)}/>
        <Inp label={t.tx.dest} value={f.dest} onChange={e=>s("dest",e.target.value)}/>
        <S2><Txt label={t.tx.notes} value={f.notes} onChange={e=>s("notes",e.target.value)} rows={2}/></S2>
      </G2>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
        <Btn color="ghost" onClick={onClose}>{t.cancel}</Btn>
        <Btn color="primary" onClick={submit} disabled={saving}>{saving?"⏳":t.save}</Btn>
      </div>
    </ModalShell>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────
function SettingsPage({lang,t,currency,onCurrencyChange}){
  const isAR=lang==="ar";
  const st=t.settings;
  const [cloudUsage,setCloudUsage]=useState(null);
  const [cloudLoading,setCloudLoading]=useState(false);
  const [cloudErr,setCloudErr]=useState("");
  const [saving,setSaving]=useState(false);
  const [localCurrency,setLocalCurrency]=useState(currency||"USD");

  useEffect(()=>{
    setCloudLoading(true);
    api.getCloudinaryUsage()
      .then(d=>setCloudUsage(d))
      .catch(()=>setCloudErr(isAR?"تعذّر تحميل بيانات Cloudinary":"Could not load Cloudinary data"))
      .finally(()=>setCloudLoading(false));
  },[]);

  const saveCurrency=async()=>{
    setSaving(true);
    try{
      await api.updateSettings({currency:localCurrency});
      onCurrencyChange(localCurrency);
    }catch{}
    finally{setSaving(false);}
  };

  const storPct=cloudUsage?Math.min(100,Math.round((cloudUsage.storage?.used||0)/(cloudUsage.storage?.limit||1)*100)):0;
  const transPct=cloudUsage?Math.min(100,Math.round((cloudUsage.transformations?.used||0)/(cloudUsage.transformations?.limit||1)*100)):0;
  const fmtBytes=b=>{if(!b)return"0 B";const k=1024,s=["B","KB","MB","GB"];const i=Math.floor(Math.log(b)/Math.log(k));return(b/Math.pow(k,i)).toFixed(1)+" "+s[i];};

  return(
    <div style={{maxWidth:640}}>
      <div style={{fontWeight:700,fontSize:16,marginBottom:20}}>⚙️ {st.title}</div>

      {/* Currency */}
      <Card style={{padding:20,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>💱 {st.currencyLabel}</div>
        <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:200}}>
            <label style={{fontSize:11.5,fontWeight:600,color:C.tx2,display:"block",marginBottom:6}}>{st.currency}</label>
            <select value={localCurrency} onChange={e=>setLocalCurrency(e.target.value)}
              style={{...baseInput,cursor:"pointer"}}>
              {CURRENCIES.map(c=>(
                <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <Btn color="primary" onClick={saveCurrency} disabled={saving}>{saving?"⏳":t.save}</Btn>
        </div>
        <div style={{marginTop:10,fontSize:12,color:C.tx3}}>
          {isAR?"الرمز الحالي: ":"Current symbol: "}
          <strong style={{fontSize:15,color:C.primary}}>{getCurrencySymbol(localCurrency)}</strong>
          {" "}{CURRENCIES.find(c=>c.code===localCurrency)?.name}
        </div>
      </Card>

      {/* Cloudinary */}
      <Card style={{padding:20,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>☁️ {st.cloudinary}</div>
        {cloudLoading&&<div style={{color:C.tx3,fontSize:13}}>⏳ {isAR?"جاري التحميل...":"Loading..."}</div>}
        {cloudErr&&<div style={{color:C.red,fontSize:13}}>{cloudErr}</div>}
        {cloudUsage&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {[
              [isAR?"التخزين":"Storage",storPct,fmtBytes(cloudUsage.storage?.used),fmtBytes(cloudUsage.storage?.limit)],
              [isAR?"التحويلات":"Transformations",transPct,cloudUsage.transformations?.used?.toLocaleString(),cloudUsage.transformations?.limit?.toLocaleString()],
            ].map(([label,pct,used,limit])=>(
              <div key={label}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5,fontWeight:600,marginBottom:6}}>
                  <span>{label}</span>
                  <span style={{color:pct>80?C.red:pct>50?C.amber:C.green}}>{pct}%</span>
                </div>
                <Prog pct={pct} color={pct>80?C.red:pct>50?C.amber:C.green} h={10}/>
                <div style={{fontSize:11,color:C.tx3,marginTop:4}}>{used} / {limit}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* System info */}
      <Card style={{padding:20}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>ℹ️ {isAR?"معلومات النظام":"System Info"}</div>
        {[
          [isAR?"الإصدار":"Version","NexERP v1.0.0"],
          [isAR?"قاعدة البيانات":"Database","MongoDB Atlas"],
          [isAR?"التخزين السحابي":"Cloud Storage","Cloudinary"],
          [isAR?"الاستضافة":"Hosting","Railway + Vercel"],
        ].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.bdr}`,fontSize:13}}>
            <span style={{color:C.tx3}}>{k}</span>
            <span style={{fontWeight:600}}>{v}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ── Global Search ─────────────────────────────────────────────────────────────
function GlobalSearch({items,txs,users,depts,lang,t,isAR,onNavigate}){
  const gs=t.globalSearch;
  const[q,setQ]=useState("");
  const[open,setOpen]=useState(false);
  const[scanning,setScanning]=useState(false);
  const[scanMsg,setScanMsg]=useState("");
  const ref=useRef(null);

  useEffect(()=>{
    const handler=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[]);

  const results=useMemo(()=>{
    const qu=q.trim().toLowerCase();
    if(!qu||qu.length<2)return null;
    const ri=items.filter(i=>
      i.name?.toLowerCase().includes(qu)||(i.nameEn||"").toLowerCase().includes(qu)||
      (i.sku||"").toLowerCase().includes(qu)||(i.barcode||"").includes(qu)
    ).slice(0,5).map(i=>({type:"item",id:i._id||i.id,label:lang==="ar"?i.name:i.nameEn||i.name,sub:(i.sku||i.barcode||""),icon:"📦",data:i}));
    const rt=txs.filter(tx=>
      (tx.itemId?.name||"").toLowerCase().includes(qu)||
      (tx.source||"").toLowerCase().includes(qu)||(tx.dest||"").toLowerCase().includes(qu)||
      (tx.userName||"").toLowerCase().includes(qu)
    ).slice(0,3).map(tx=>({type:"tx",id:tx._id,label:tx.itemId?.name||"—",sub:`${tx.type} · ${tx.qty} · ${tx.userName}`,icon:tx.type==="IN"?"↓":"↑",data:tx}));
    const ru=(users||[]).filter(u=>
      u.name?.toLowerCase().includes(qu)||(u.username||"").toLowerCase().includes(qu)||
      (u.email||"").toLowerCase().includes(qu)
    ).slice(0,3).map(u=>({type:"user",id:u._id||u.id,label:u.name,sub:`@${u.username}`,icon:"👤",data:u}));
    const rd=depts.filter(d=>
      d.name?.toLowerCase().includes(qu)||(d.nameEn||"").toLowerCase().includes(qu)
    ).slice(0,2).map(d=>({type:"dept",id:d._id||d.id,label:lang==="ar"?d.name:d.nameEn||d.name,sub:"",icon:"🗂",data:d}));
    return[...ri,...rt,...ru,...rd];
  },[q,items,txs,users,depts,lang]);

  const handleSelect=r=>{
    setQ("");setOpen(false);
    if(r.type==="item")onNavigate("item",r.data);
    else if(r.type==="tx")onNavigate("tx");
    else if(r.type==="user")onNavigate("users");
    else if(r.type==="dept")onNavigate("dept");
  };

  const handleBarcodeDetect=async code=>{
    const clean=String(code||"").trim();
    if(!clean)return;
    setScanning(false);
    setScanMsg("");
    const local=items.find(i=>String(i.barcode||"").trim()===clean);
    if(local){
      setQ("");setOpen(false);
      onNavigate("item",local);
      return;
    }
    try{
      const found=await api.getByBarcode(clean);
      if(found){
        setQ("");setOpen(false);
        onNavigate("item",found);
        return;
      }
    }catch{}
    setQ(clean);
    setOpen(true);
    setScanMsg(isAR?"لم يتم العثور على صنف بهذا الباركود":"No item found for this barcode");
  };

  return(
    <div ref={ref} style={{position:"relative",flex:1,maxWidth:400}}>
      {scanning&&<BarcodeScanner t={t} lang={lang} onClose={()=>setScanning(false)} onDetect={handleBarcodeDetect}/>}
      <div style={{display:"flex",alignItems:"center",gap:8,background:C.surf2,border:`1px solid ${C.bdr}`,borderRadius:R.sm,padding:"6px 12px"}}>
        <span style={{fontSize:14,color:C.tx3,flexShrink:0}}>🔍</span>
        <input value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)}
          placeholder={gs.placeholder}
          style={{border:"none",background:"none",outline:"none",fontSize:13,color:C.tx,width:"100%",fontFamily:"inherit"}}/>
        <button onClick={()=>setScanning(true)} title={isAR?"مسح باركود":"Scan barcode"}
          style={{border:"none",background:"none",cursor:"pointer",color:C.tx3,fontSize:16,padding:0,flexShrink:0,lineHeight:1}}>
          📷
        </button>
        {q&&<button onClick={()=>{setQ("");setOpen(false);}} style={{border:"none",background:"none",cursor:"pointer",color:C.tx3,fontSize:16,padding:0,flexShrink:0}}>✕</button>}
      </div>
      {scanMsg&&<div style={{position:"absolute",top:"calc(100% + 4px)",[isAR?"right":"left"]:0,zIndex:201,
        background:C.redSoft,color:C.red,border:`1px solid #fca5a5`,borderRadius:R.sm,padding:"6px 10px",fontSize:12,boxShadow:SH.sm}}>
        {scanMsg}
      </div>}
      {open&&q.length>=2&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",[isAR?"right":"left"]:0,width:"100%",minWidth:300,
          background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:R.md,boxShadow:SH.lg,zIndex:200,overflow:"hidden"}}>
          {(!results||results.length===0)?(
            <div style={{padding:20,textAlign:"center",color:C.tx3,fontSize:13}}>{gs.noResults}</div>
          ):(
            <>
              {[{key:"item",label:gs.items},{key:"tx",label:gs.txs},{key:"user",label:gs.users},{key:"dept",label:gs.depts}].map(({key,label})=>{
                const group=results.filter(r=>r.type===key);
                if(!group.length)return null;
                return(
                  <div key={key}>
                    <div style={{padding:"6px 14px",fontSize:10.5,fontWeight:700,color:C.tx3,textTransform:"uppercase",letterSpacing:.5,background:C.surf2,borderBottom:`1px solid ${C.bdr}`}}>{label}</div>
                    {group.map(r=>(
                      <button key={r.id} onClick={()=>handleSelect(r)}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",width:"100%",border:"none",
                          background:"none",cursor:"pointer",textAlign:isAR?"right":"left",fontFamily:"inherit",
                          borderBottom:`1px solid ${C.surf2}`}}
                        onMouseEnter={e=>e.currentTarget.style.background=C.surf2}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <span style={{fontSize:16,flexShrink:0}}>{r.icon}</span>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.label}</div>
                          {r.sub&&<div style={{fontSize:11,color:C.tx3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.sub}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function App(){
  const [lang,setLang]=useState("ar");
  const t=T[lang];
  const isAR=lang==="ar";

  // Auth
  const [authed,setAuthed]=useState(false);
  const [currentUser,setCurrentUser]=useState(null);
  const [un,setUn]=useState("");
  const [pw,setPw]=useState("");
  const [loginErr,setLoginErr]=useState("");
  const [loginLoading,setLoginLoading]=useState(false);

  // App data
  const [items,setItems]=useState([]);
  const [depts,setDepts]=useState([]);
  const [cats,setCats]=useState([]);
  const [users,setUsers]=useState([]);
  const [txs,setTxs]=useState([]);
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(false);
  const [currency,setCurrency]=useState("USD");
  const [editTxData,setEditTxData]=useState(null);

  // UI
  const [page,setPage]=useState("dash");
  const [modal,setModal]=useState(null);
  const [editItem,setEditItem]=useState(null);
  const [selectedItem,setSelectedItem]=useState(null);
  const [txItemId,setTxItemId]=useState(null);
  const [delQ,setDelQ]=useState(null);
  const [toast,setToast]=useState(null);
  const [sidebarOpen,setSidebarOpen]=useState(window.innerWidth>=768);
  const isMobile=()=>window.innerWidth<768;

  useEffect(()=>{
    const onResize=()=>{ if(window.innerWidth>=768) setSidebarOpen(true); };
    window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[]);

  const showToast=(msg,type="success")=>setToast({msg,type});
  const closeModal=()=>{setModal(null);setEditItem(null);setTxItemId(null);};
  const perm=currentUser?resolvePerms(currentUser):{};

  // ── Check saved token on mount ────────────────────────────────────────────
  useEffect(()=>{
    const savedToken=localStorage.getItem("nexerp_token");
    const savedUser=localStorage.getItem("nexerp_user");
    if(savedToken&&savedUser){
      setCurrentUser(JSON.parse(savedUser));
      setAuthed(true);
    }
  },[]);

  // ── Load data when authed ─────────────────────────────────────────────────
  useEffect(()=>{
    if(!authed)return;
    loadAll();
  },[authed]);

  const loadAll=async()=>{
    setLoading(true);
    try{
      const [d,c,i,tx,s,u,sett]=await Promise.all([
        api.getDepts(),api.getCats(),api.getItems(),
        api.getTxs(),api.getStats(),
        resolvePerms(currentUser||{})?.canManageUsers?api.getUsers():Promise.resolve([]),
        api.getSettings().catch(()=>({})),
      ]);
      setDepts(d);setCats(c);setItems(i);setTxs(tx);setStats(s);setUsers(u);
      if(sett?.currency)setCurrency(sett.currency);
    }catch(e){showToast(e.message,"error");}
    finally{setLoading(false);}
  };

  const refreshStats=async()=>{
    try{const s=await api.getStats();setStats(s);}catch{}
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const doLogin=async()=>{
    if(!un||!pw)return;
    setLoginLoading(true);setLoginErr("");
    try{
      const res=await api.login(un,pw);
      localStorage.setItem("nexerp_token",res.token);
      localStorage.setItem("nexerp_user",JSON.stringify(res.user));
      setCurrentUser(res.user);
      setAuthed(true);
    }catch(e){setLoginErr(t.badLogin);}
    finally{setLoginLoading(false);}
  };

  const doLogout=()=>{
    localStorage.removeItem("nexerp_token");
    localStorage.removeItem("nexerp_user");
    setAuthed(false);setCurrentUser(null);
    setItems([]);setDepts([]);setCats([]);setUsers([]);setTxs([]);setStats(null);
    setUn("");setPw("");
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveItem=async(data,id)=>{
    try{
      let saved;
      if(id){
        saved=await api.updateItem(id,data);
        setItems(ps=>ps.map(p=>(p._id||p.id)===id?saved:p));
        if(selectedItem&&(selectedItem._id||selectedItem.id)===id) setSelectedItem(saved);
      }else{saved=await api.addItem(data);setItems(ps=>[saved,...ps]);}
      await refreshStats();
      showToast(t.saved);
      closeModal();
      return saved;
    }catch(e){showToast(e.message,"error");throw e;}
  };

  const saveTx=async(data)=>{
    try{
      const res=await api.addTx(data);
      setItems(ps=>ps.map(p=>(p._id||p.id)===(data.itemId)?{...p,qty:res.updatedQty}:p));
      if(selectedItem&&(selectedItem._id||selectedItem.id)===data.itemId)
        setSelectedItem(p=>({...p,qty:res.updatedQty}));
      const newTx={...res.transaction,itemId:items.find(i=>(i._id||i.id)===data.itemId)};
      setTxs(ps=>[newTx,...ps]);
      await refreshStats();
      showToast(t.saved);
      closeModal();
    }catch(e){showToast(e.message,"error");}
  };

  const doDelete=async()=>{
    if(!delQ)return;
    try{
      if(delQ.type==="item"){await api.deleteItem(delQ.id);setItems(ps=>ps.filter(p=>(p._id||p.id)!==delQ.id));await refreshStats();}
      if(delQ.type==="dept"){await api.deleteDept(delQ.id);setDepts(ps=>ps.filter(d=>(d._id||d.id)!==delQ.id));}
      if(delQ.type==="cat"){await api.deleteCat(delQ.id);setCats(ps=>ps.filter(c=>(c._id||c.id)!==delQ.id));}
      if(delQ.type==="user"){await api.deleteUser(delQ.id);setUsers(ps=>ps.filter(u=>(u._id||u.id)!==delQ.id));}
      if(delQ.type==="tx"){
        await api.deleteTx(delQ.id);
        setTxs(ps=>ps.filter(tx=>(tx._id||tx.id)!==delQ.id));
        await refreshStats();
      }
      setDelQ(null);setModal(null);
      showToast(t.saved);
    }catch(e){showToast(e.message,"error");}
  };

  const doEditTx=async(id,data)=>{
    try{
      const res=await api.updateTx(id,data);
      setTxs(ps=>ps.map(tx=>(tx._id||tx.id)===id?{...tx,...res.transaction,itemId:tx.itemId}:tx));
      // Update item qty if stock changed
      if(res.updatedQty!==undefined&&res.itemId){
        setItems(ps=>ps.map(p=>(p._id||p.id)===res.itemId?{...p,qty:res.updatedQty}:p));
      }
      await refreshStats();
      setEditTxData(null);
      showToast(t.saved);
    }catch(e){showToast(e.message,"error");}
  };

  // ── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if(!authed){
    return(
      <>
        <style>{`@keyframes slideIn{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
          background:"linear-gradient(135deg,#1e3a5f,#0f172a)",
          fontFamily:"'Segoe UI',system-ui,sans-serif",direction:isAR?"rtl":"ltr"}}>
          <div style={{background:C.surf,borderRadius:R.lg+4,padding:42,width:380,boxShadow:SH.lg}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:30}}>
              <div style={{fontSize:36}}>📦</div>
              <div>
                <div style={{fontSize:17,fontWeight:800,color:C.tx}}>{t.appName}</div>
                <div style={{fontSize:11,color:C.tx3}}>{t.tag}</div>
              </div>
            </div>
            <div style={{fontSize:21,fontWeight:800,color:C.tx,marginBottom:22}}>{t.login}</div>
            <div style={{display:"flex",flexDirection:"column",gap:13,marginBottom:16}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:5}}>{t.username}</div>
                <input value={un} onChange={e=>setUn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}
                  placeholder="admin" style={{...baseInput}}/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:5}}>{t.password}</div>
                <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}
                  placeholder="admin" style={{...baseInput}}/>
              </div>
            </div>
            {loginErr&&<div style={{color:C.red,fontSize:13,fontWeight:500,marginBottom:10}}>{loginErr}</div>}
            <button onClick={doLogin} disabled={loginLoading}
              style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",
                background:loginLoading?"#93c5fd":C.primary,color:"#fff",border:"none",
                borderRadius:R.sm,padding:"13px",fontSize:15,fontWeight:700,cursor:loginLoading?"not-allowed":"pointer",
                fontFamily:"inherit"}}>
              {loginLoading?"⏳ "+t.loading:t.enterSystem+" →"}
            </button>
            <div style={{marginTop:20,display:"flex",justifyContent:"center"}}>
              <div style={{display:"flex",border:`1px solid ${C.bdr}`,borderRadius:R.sm,overflow:"hidden"}}>
                {["ar","en"].map(l=>(
                  <button key={l} onClick={()=>setLang(l)}
                    style={{padding:"6px 16px",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",
                      fontFamily:"inherit",background:lang===l?C.primary:C.surf2,color:lang===l?"#fff":C.tx2}}>
                    {l==="ar"?"العربية":"English"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── APP SHELL ─────────────────────────────────────────────────────────────
  const navItems=[
    {id:"dash",label:t.nav.dash,icon:"🏠"},
    {id:"inv",label:t.nav.inv,icon:"📦"},
    {id:"tx",label:t.nav.tx,icon:"📋"},
    {id:"dept",label:t.nav.dept,icon:"🗂"},
    ...(perm.canManageUsers?[{id:"users",label:t.nav.users,icon:"👥"}]:[]),
    {id:"profile",label:t.nav.profile,icon:"👤"},
    ...(perm.canManageUsers?[{id:"settings",label:t.nav.settings,icon:"⚙️"}]:[]),
  ];

  return(
    <>
      <style>{`
        @keyframes slideIn{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}
        ::-webkit-scrollbar-track{background:transparent}
      `}</style>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <div style={{display:"flex",height:"100vh",overflow:"hidden",
        fontFamily:"'Segoe UI',system-ui,'Noto Sans Arabic',sans-serif",
        background:C.bg,color:C.tx,direction:isAR?"rtl":"ltr"}}>

        {/* Sidebar backdrop (mobile) */}
        {sidebarOpen&&isMobile()&&(
          <div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:40}}/>
        )}

        {/* Sidebar */}
        <aside style={{
          width:220,minWidth:220,background:C.sidebar,display:"flex",flexDirection:"column",
          height:"100vh",flexShrink:0,overflow:"hidden",
          ...(isMobile()?{
            position:"fixed",
            top:0,bottom:0,
            [isAR?"right":"left"]:0,
            zIndex:50,
            transform:sidebarOpen?"translateX(0)":`translateX(${isAR?"100%":"-100%"})`,
            transition:"transform .25s ease",
          }:{
            transform:sidebarOpen?"translateX(0)":`translateX(${isAR?"220px":"-220px"})`,
            marginInlineStart:sidebarOpen?0:-220,
            transition:"transform .25s ease, margin-inline-start .25s ease",
          })
        }}>
          <div style={{padding:"18px 16px 14px",borderBottom:`1px solid ${C.sidebarBdr}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{fontSize:22}}>📦</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:700,color:"#f1f5f9",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.appName}</div>
              <div style={{fontSize:10,color:"#475569"}}>{t.tag}</div>
            </div>
          </div>
          <nav style={{flex:1,padding:"10px 8px",overflowY:"auto",minHeight:0}}>
            {navItems.map(n=>(
              <button key={n.id} onClick={()=>{setPage(n.id);setSelectedItem(null);if(isMobile())setSidebarOpen(false);}}
                style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:R.sm,
                  border:"none",width:"100%",textAlign:isAR?"right":"left",cursor:"pointer",
                  fontFamily:"inherit",fontSize:13,fontWeight:500,marginBottom:2,
                  background:page===n.id?C.primary:"transparent",
                  color:page===n.id?"#fff":"#94a3b8"}}>
                <span style={{fontSize:16}}>{n.icon}</span>{n.label}
              </button>
            ))}
          </nav>
          <div style={{padding:"10px 8px 16px",borderTop:`1px solid ${C.sidebarBdr}`}}>
            <div style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:R.sm,background:"#1e293b",marginBottom:6}}>
              <div style={{width:30,height:30,background:C.primary,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:800,flexShrink:0}}>
                {currentUser.name.charAt(0)}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:600,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentUser.name}</div>
                <div style={{fontSize:10.5,color:"#475569"}}>{t.users.roles[currentUser.role]}</div>
              </div>
            </div>
            <div style={{display:"flex",marginBottom:6,borderRadius:R.sm,overflow:"hidden",border:`1px solid ${C.sidebarBdr}`}}>
              {["ar","en"].map(l=>(
                <button key={l} onClick={()=>setLang(l)}
                  style={{flex:1,padding:"5px",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"inherit",
                    background:lang===l?C.primary:"#1e293b",color:lang===l?"#fff":"#64748b"}}>
                  {l==="ar"?"عربي":"EN"}
                </button>
              ))}
            </div>
            <button onClick={doLogout}
              style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:R.sm,
                border:"none",background:"none",color:"#64748b",fontSize:12.5,fontWeight:500,
                width:"100%",cursor:"pointer",fontFamily:"inherit"}}>
              🚪 {t.logout}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
          <div style={{height:54,background:C.surf,borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",padding:"0 12px 0 16px",gap:10,flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
            <button onClick={()=>setSidebarOpen(o=>!o)} style={{display:"flex",alignItems:"center",justifyContent:"center",width:34,height:34,border:"none",background:"none",cursor:"pointer",borderRadius:R.sm,color:C.tx,fontSize:18,flexShrink:0}} title="Toggle menu">☰</button>
            <GlobalSearch items={items} txs={txs} users={users} depts={depts} lang={lang} t={t} isAR={isAR}
              onNavigate={(pg,data)=>{
                if(pg==="item"&&data){setSelectedItem(data);setPage("item");}
                else{setPage(pg);setSelectedItem(null);}
              }}/>
            {page==="inv"&&perm.canAdd&&<Btn color="primary" size="sm" onClick={()=>{setEditItem(null);setModal("item");}}>＋ {!isMobile()?t.inv.add:""}</Btn>}
            {page==="item"&&perm.canEdit&&selectedItem&&<Btn color="ghost" size="sm" onClick={()=>{setEditItem(selectedItem);setModal("item");}}>✏️</Btn>}
            {page==="item"&&perm.canTx&&selectedItem&&<Btn color="primary" size="sm" onClick={()=>{setTxItemId(selectedItem._id||selectedItem.id);setModal("tx");}}>↕</Btn>}
            {page==="tx"&&perm.canTx&&<Btn color="primary" size="sm" onClick={()=>{setTxItemId(null);setModal("tx");}}>＋</Btn>}
            <div style={{fontSize:11,color:C.tx3,background:C.surf2,padding:"3px 8px",borderRadius:99,border:`1px solid ${C.bdr}`,whiteSpace:"nowrap",flexShrink:0}}>
              {t.users.roles[currentUser.role]}
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 22px"}}>
            {page==="dash"&&<Dashboard stats={stats} lang={lang} t={t} currency={currency} onNav={setPage}/>}
            {page==="inv"&&<InventoryPage items={items} depts={depts} cats={cats} lang={lang} t={t} perm={perm} loading={loading}
              onAdd={()=>{setEditItem(null);setModal("item");}}
              onEdit={item=>{setEditItem(item);setModal("item");}}
              onDelete={id=>{setDelQ({type:"item",id});setModal("confirm");}}
              onTx={id=>{setTxItemId(id);setModal("tx");}}
              onDetail={item=>{setSelectedItem(item);setPage("item");}}/>}
            {page==="item"&&selectedItem&&<ItemDetailPage
              item={items.find(i=>(i._id||i.id)===(selectedItem._id||selectedItem.id))||selectedItem}
              depts={depts} cats={cats} txs={txs} lang={lang} t={t} perm={perm} currency={currency}
              onBack={()=>setPage("inv")}
              onEdit={item=>{setEditItem(item);setModal("item");}}
              onTx={id=>{setTxItemId(id);setModal("tx");}}/>}
            {page==="tx"&&<TxPage txs={txs} items={items} depts={depts} lang={lang} t={t} perm={perm} loading={loading}
              onRecord={id=>{setTxItemId(id);setModal("tx");}}
              onEditTx={tx=>setEditTxData(tx)}
              onDeleteTx={id=>{setDelQ({type:"tx",id});setModal("confirm");}}/>}
            {page==="settings"&&perm.canManageUsers&&<SettingsPage lang={lang} t={t} currency={currency} onCurrencyChange={c=>{setCurrency(c);showToast(t.settings.saved);}}/>}
            {page==="dept"&&<DeptPage depts={depts} cats={cats} items={items} lang={lang} t={t} perm={perm}
              onAddDept={async d=>{try{const nd=await api.addDept(d);setDepts(ps=>[...ps,nd]);showToast(t.saved);}catch(e){showToast(e.message,"error");}}}
              onDelDept={id=>{setDelQ({type:"dept",id});setModal("confirm");}}
              onAddCat={async c=>{try{const nc=await api.addCat(c);setCats(ps=>[...ps,nc]);showToast(t.saved);}catch(e){showToast(e.message,"error");}}}
              onDelCat={id=>{setDelQ({type:"cat",id});setModal("confirm");}}/>}
            {page==="users"&&<UsersPage users={users} currentUser={currentUser} txs={txs} lang={lang} t={t} perm={perm}
              onAdd={async u=>{try{const nu=await api.addUser(u);setUsers(ps=>[...ps,nu]);showToast(t.saved);}catch(e){showToast(e.message,"error");}}}
              onUpdate={async(id,d)=>{try{const u=await api.updateUser(id,d);setUsers(ps=>ps.map(x=>(x._id||x.id)===id?u:x));showToast(t.saved);}catch(e){showToast(e.message,"error");}}}
              onToggle={async(id,active)=>{try{await api.updateUser(id,{active});setUsers(ps=>ps.map(x=>(x._id||x.id)===id?{...x,active}:x));showToast(t.saved);}catch(e){showToast(e.message,"error");}}}
              onDelete={id=>{setDelQ({type:"user",id});setModal("confirm");}}/>}
            {page==="profile"&&currentUser&&<UserProfilePage currentUser={currentUser} txs={txs} lang={lang} t={t} perm={perm}/>}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal==="item"&&(
        <ModalShell title={editItem?t.inv.edit:t.inv.add} onClose={closeModal} wide>
          <ItemForm init={editItem} depts={depts} cats={cats} lang={lang} t={t} onSave={saveItem} onClose={closeModal}/>
        </ModalShell>
      )}
      {modal==="tx"&&(
        <ModalShell title={t.tx.record} onClose={closeModal}>
          <TxForm items={items} currentUser={currentUser} t={t} lang={lang} onSave={saveTx} onClose={closeModal} prefillId={txItemId}/>
        </ModalShell>
      )}
      {modal==="confirm"&&(
        <ModalShell title={t.confirm} onClose={()=>{setModal(null);setDelQ(null);}}>
          <p style={{color:C.tx2,fontSize:14,marginBottom:20}}>{t.confirmMsg}</p>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn color="ghost" onClick={()=>{setModal(null);setDelQ(null);}}>{t.cancel}</Btn>
            <Btn color="red" onClick={doDelete}>{t.delete}</Btn>
          </div>
        </ModalShell>
      )}
      {editTxData&&(
        <TxEditModal tx={editTxData} items={items} t={t} lang={lang}
          onSave={(id,data)=>doEditTx(id,data)}
          onClose={()=>setEditTxData(null)}/>
      )}
    </>
  );
}
