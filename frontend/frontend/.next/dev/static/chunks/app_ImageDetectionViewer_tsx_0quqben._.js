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
function ImageDetectionViewer({ imageSrc, detections: propDetections }) {
    _s();
    const [detections, setDetections] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(propDetections || []);
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
                return;
            }
            if (!imageSrc) {
                setDetections([]);
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
                                        label: item.label ?? item.name ?? `Espiga de Trigo #${index + 1}`,
                                        confidence: typeof item.confidence === 'number' ? item.confidence : 0.90,
                                        type: item.type ?? 'wheat',
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
                setDetections([]);
            }
            fetchDetections();
        }
    }["ImageDetectionViewer.useEffect"], [
        propDetections,
        imageSrc
    ]);
    const handleImageError = ()=>{
        // Tenta carregar do diretório público local com o mesmo nome exato
        if (!imageSrc || !displaySrc) return;
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
        children: displaySrc ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                position: 'relative',
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'inline-block'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                    src: displaySrc,
                    alt: "Imagem aérea do campo com detecção de cabeças de trigo",
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
                    lineNumber: 132,
                    columnNumber: 11
                }, this),
                detections.map((det)=>{
                    const boxX = det.box?.x ?? 0;
                    const boxY = det.box?.y ?? 0;
                    const boxW = det.box?.width ?? 10;
                    const boxH = det.box?.height ?? 10;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            position: 'absolute',
                            left: `${boxX}%`,
                            top: `${boxY}%`,
                            width: `${boxW}%`,
                            height: `${boxH}%`,
                            border: '2px solid #f85149',
                            backgroundColor: 'transparent',
                            borderRadius: '1px',
                            zIndex: 10
                        }
                    }, det.id, false, {
                        fileName: "[project]/app/ImageDetectionViewer.tsx",
                        lineNumber: 154,
                        columnNumber: 15
                    }, this);
                })
            ]
        }, void 0, true, {
            fileName: "[project]/app/ImageDetectionViewer.tsx",
            lineNumber: 123,
            columnNumber: 9
        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                color: 'var(--muted)',
                fontSize: '13px',
                textAlign: 'center',
                padding: '24px'
            },
            children: "Selecione uma imagem para iniciar a análise."
        }, void 0, false, {
            fileName: "[project]/app/ImageDetectionViewer.tsx",
            lineNumber: 172,
            columnNumber: 9
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/ImageDetectionViewer.tsx",
        lineNumber: 108,
        columnNumber: 5
    }, this);
}
_s(ImageDetectionViewer, "KkL+NDv6ueZGXEvYnAbkDFumHwk=");
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