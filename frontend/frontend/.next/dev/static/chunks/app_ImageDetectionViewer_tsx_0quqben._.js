(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/ImageDetectionViewer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ImageDetectionViewer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
// Detecções padrão de demonstração para quando o backend não retornar dados
const DEFAULT_DETECTIONS = [
    {
        id: 1,
        label: 'Erva Daninha: Braquiária',
        confidence: 0.94,
        type: 'erva_daninha',
        severity: 'alta',
        box: {
            x: 22,
            y: 35,
            width: 18,
            height: 22
        }
    },
    {
        id: 2,
        label: 'Erva Daninha: Capim-Colonião',
        confidence: 0.88,
        type: 'erva_daninha',
        severity: 'media',
        box: {
            x: 55,
            y: 18,
            width: 20,
            height: 25
        }
    },
    {
        id: 3,
        label: 'Erva Daninha: Corda-de-Viola',
        confidence: 0.91,
        type: 'erva_daninha',
        severity: 'alta',
        box: {
            x: 40,
            y: 62,
            width: 16,
            height: 20
        }
    }
];
function ImageDetectionViewer({ imageSrc = '/cana_teste.jpg', detections: propDetections }) {
    _s();
    const [detections, setDetections] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(propDetections || DEFAULT_DETECTIONS);
    const [selectedDetection, setSelectedDetection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [displaySrc, setDisplaySrc] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(imageSrc);
    // Sincroniza displaySrc sempre que a prop imageSrc for atualizada
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ImageDetectionViewer.useEffect": ()=>{
            setDisplaySrc(imageSrc);
        }
    }["ImageDetectionViewer.useEffect"], [
        imageSrc
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ImageDetectionViewer.useEffect": ()=>{
            if (propDetections !== undefined) {
                setDetections(propDetections);
                setSelectedDetection(null);
                return;
            }
            async function fetchDetections() {
                try {
                    let res = await fetch('http://127.0.0.1:8000/api/anomalies').catch({
                        "ImageDetectionViewer.useEffect.fetchDetections": ()=>null
                    }["ImageDetectionViewer.useEffect.fetchDetections"]);
                    if (!res || !res.ok) {
                        res = await fetch('http://localhost:8000/api/anomalies').catch({
                            "ImageDetectionViewer.useEffect.fetchDetections": ()=>null
                        }["ImageDetectionViewer.useEffect.fetchDetections"]);
                    }
                    if (res && res.ok) {
                        const data = await res.json();
                        const list = Array.isArray(data) ? data : data.detections || data.anomalies || [];
                        if (list.length > 0) {
                            const normalizedList = list.map({
                                "ImageDetectionViewer.useEffect.fetchDetections.normalizedList": (item, index)=>{
                                    const box = item.box || {
                                        x: item.x ?? item.left ?? 20,
                                        y: item.y ?? item.top ?? 20,
                                        width: item.width ?? item.w ?? 15,
                                        height: item.height ?? item.h ?? 15
                                    };
                                    return {
                                        id: item.id ?? index + 1,
                                        label: item.label ?? item.name ?? 'Erva Daninha Detectada',
                                        confidence: typeof item.confidence === 'number' ? item.confidence : 0.90,
                                        type: item.type ?? 'erva_daninha',
                                        severity: item.severity ?? 'media',
                                        box: {
                                            x: Number(box.x) || 0,
                                            y: Number(box.y) || 0,
                                            width: Number(box.width) || 10,
                                            height: Number(box.height) || 10
                                        }
                                    };
                                }
                            }["ImageDetectionViewer.useEffect.fetchDetections.normalizedList"]);
                            setDetections(normalizedList);
                            return;
                        }
                    }
                } catch  {
                // Em caso de erro na requisição, mantém as detecções padrão
                }
                setDetections(DEFAULT_DETECTIONS);
            }
            fetchDetections();
        }
    }["ImageDetectionViewer.useEffect"], [
        propDetections,
        imageSrc
    ]);
    const handleImageError = ()=>{
        // Tenta carregar do diretório público local com o mesmo nome exato
        const filename = imageSrc.split("/").pop()?.split("?")[0];
        if (filename && !displaySrc.startsWith("/") && !displaySrc.startsWith("blob:")) {
            setDisplaySrc(`/${decodeURIComponent(filename)}`);
            return;
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            position: 'relative',
            width: '100%',
            height: '100%',
            minHeight: '420px',
            background: '#0d1117',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: '12px'
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                position: 'relative',
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'inline-block'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                    src: displaySrc,
                    alt: "Monitoramento UAV - Detecção de Ervas Daninhas",
                    style: {
                        maxWidth: '100%',
                        maxHeight: '520px',
                        objectFit: 'contain',
                        display: 'block',
                        borderRadius: '8px'
                    },
                    onError: handleImageError
                }, displaySrc, false, {
                    fileName: "[project]/app/ImageDetectionViewer.tsx",
                    lineNumber: 154,
                    columnNumber: 9
                }, this),
                detections.map((det)=>{
                    const isSelected = selectedDetection?.id === det.id;
                    const isWeed = det.type !== 'cana_de_acucar';
                    const boxColor = isWeed ? '#f85149' : '#2ea043';
                    const bgOpacity = isWeed ? 'rgba(248, 81, 73, 0.22)' : 'rgba(46, 160, 67, 0.2)';
                    const boxX = det.box?.x ?? 0;
                    const boxY = det.box?.y ?? 0;
                    const boxW = det.box?.width ?? 10;
                    const boxH = det.box?.height ?? 10;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onClick: ()=>setSelectedDetection(isSelected ? null : det),
                        style: {
                            position: 'absolute',
                            left: `${boxX}%`,
                            top: `${boxY}%`,
                            width: `${boxW}%`,
                            height: `${boxH}%`,
                            border: isSelected ? '3px solid #ffcc00' : `2px solid ${boxColor}`,
                            backgroundColor: isSelected ? 'rgba(255, 204, 0, 0.28)' : bgOpacity,
                            cursor: 'pointer',
                            borderRadius: '4px',
                            boxShadow: isSelected ? '0 0 14px rgba(255,204,0,0.9)' : `0 0 8px ${isWeed ? 'rgba(248,81,73,0.5)' : 'rgba(46,160,67,0.4)'}`,
                            transition: 'all 0.15s ease-in-out',
                            zIndex: isSelected ? 25 : 10
                        },
                        title: `${det.label} (${(det.confidence * 100).toFixed(0)}%) - Severidade: ${det.severity || 'n/a'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                position: 'absolute',
                                top: '-24px',
                                left: '-2px',
                                background: isSelected ? '#ffcc00' : boxColor,
                                color: isSelected ? '#000000' : '#ffffff',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '3px',
                                whiteSpace: 'nowrap',
                                lineHeight: '1.2',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: isWeed ? '🌿' : '🌱'
                                }, void 0, false, {
                                    fileName: "[project]/app/ImageDetectionViewer.tsx",
                                    lineNumber: 223,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: det.label
                                }, void 0, false, {
                                    fileName: "[project]/app/ImageDetectionViewer.tsx",
                                    lineNumber: 224,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        opacity: 0.9
                                    },
                                    children: [
                                        "(",
                                        (det.confidence * 100).toFixed(0),
                                        "%)"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/ImageDetectionViewer.tsx",
                                    lineNumber: 225,
                                    columnNumber: 17
                                }, this),
                                det.severity && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        background: 'rgba(0,0,0,0.25)',
                                        padding: '1px 4px',
                                        borderRadius: '2px',
                                        textTransform: 'uppercase',
                                        fontSize: '9px'
                                    },
                                    children: det.severity
                                }, void 0, false, {
                                    fileName: "[project]/app/ImageDetectionViewer.tsx",
                                    lineNumber: 227,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/ImageDetectionViewer.tsx",
                            lineNumber: 204,
                            columnNumber: 15
                        }, this)
                    }, det.id, false, {
                        fileName: "[project]/app/ImageDetectionViewer.tsx",
                        lineNumber: 180,
                        columnNumber: 13
                    }, this);
                })
            ]
        }, void 0, true, {
            fileName: "[project]/app/ImageDetectionViewer.tsx",
            lineNumber: 145,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/ImageDetectionViewer.tsx",
        lineNumber: 130,
        columnNumber: 5
    }, this);
}
_s(ImageDetectionViewer, "tHHBMhSq+0bABmrB3fxfRYhac4g=");
_c = ImageDetectionViewer;
var _c;
__turbopack_context__.k.register(_c, "ImageDetectionViewer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/ImageDetectionViewer.tsx [app-client] (ecmascript, next/dynamic entry)", (function(__turbopack_context__){

__turbopack_context__.n(__turbopack_context__.i("[project]/app/ImageDetectionViewer.tsx [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=app_ImageDetectionViewer_tsx_0quqben._.js.map