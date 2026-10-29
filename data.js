const defaultFamilyData = [
    {
        "id": 1,
        "name": "शिरपति",
        "spouses": [
            "श्रीविद्या (शिरिविद्या)"
        ],
        "parentId": null,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 2,
        "name": "शिवशंकर",
        "spouses": [
            "वेदमाया"
        ],
        "parentId": 1,
        "gender": "M",
        "hierarchyOrder": 1
    },
    {
        "id": 3,
        "name": "नन्दिकेशर",
        "spouses": [],
        "parentId": 1,
        "gender": "M",
        "hierarchyOrder": 2
    },
    {
        "id": 4,
        "name": "चन्द्रशेखर",
        "spouses": [],
        "parentId": 1,
        "gender": "M",
        "hierarchyOrder": 3
    },
    {
        "id": 5,
        "name": "",
        "spouses": [],
        "parentId": 1,
        "gender": "M",
        "hierarchyOrder": 6
    },
    {
        "id": 6,
        "name": "पमापति",
        "spouses": [
            "विष्णुमाया"
        ],
        "parentId": 2,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 7,
        "name": "धनपति",
        "spouses": [],
        "parentId": 2,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 8,
        "name": "लक्ष्मीपति",
        "spouses": [
            "छाया कुमारी"
        ],
        "parentId": 2,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 9,
        "name": "",
        "spouses": [],
        "parentId": 6,
        "gender": "M",
        "hierarchyOrder": 1
    },
    {
        "id": 10,
        "name": "झनकप्रसाद",
        "spouses": [],
        "parentId": 6,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 11,
        "name": "मोहनलाल",
        "spouses": [
            "लक्ष्मीमाया"
        ],
        "parentId": 6,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 12,
        "name": "मोतिराम (वुचे जिवा)",
        "spouses": [],
        "parentId": 6,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 13,
        "name": "मोतिकृष्ण",
        "spouses": [
            "भक्तकुमारी",
            "तारादेवी"
        ],
        "parentId": 8,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 14,
        "name": "ताराकृष्ण",
        "spouses": [
            "हिराकुमारी"
        ],
        "parentId": 11,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 15,
        "name": "हरिप्रसाद",
        "spouses": [
            "जानकी"
        ],
        "parentId": 11,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 16,
        "name": "भक्तिनाथ",
        "spouses": [],
        "parentId": 11,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 17,
        "name": "प्रेमनाथ",
        "spouses": [],
        "parentId": 11,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 18,
        "name": "झनकनाथ",
        "spouses": [],
        "parentId": 11,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 19,
        "name": "डेमकृष्ण",
        "spouses": [],
        "parentId": 11,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 20,
        "name": "उद्धव",
        "spouses": [
            "जानुका"
        ],
        "parentId": 13,
        "gender": "M",
        "motherName": "भक्तकुमारी",
        "hierarchyOrder": 99
    },
    {
        "id": 21,
        "name": "विदुर (भोला)",
        "spouses": [
            "उषा"
        ],
        "parentId": 13,
        "gender": "M",
        "motherName": "तारादेवी",
        "hierarchyOrder": 99
    },
    {
        "id": 22,
        "name": "जयराम",
        "spouses": [
            "सृजना"
        ],
        "parentId": 13,
        "gender": "M",
        "motherName": "तारादेवी",
        "hierarchyOrder": 99
    },
    {
        "id": 23,
        "name": "नानिराम (निकेश)",
        "spouses": [
            "पार्वती"
        ],
        "parentId": 13,
        "gender": "M",
        "motherName": "तारादेवी",
        "hierarchyOrder": 99
    },
    {
        "id": 24,
        "name": "विष्णु",
        "spouses": [
            "दुर्गा",
            "अर्पणा"
        ],
        "parentId": 14,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 25,
        "name": "वालकृष्ण",
        "spouses": [
            "सरस्वती"
        ],
        "parentId": 14,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 26,
        "name": "शम्भु",
        "spouses": [
            "प्रतिभा"
        ],
        "parentId": 14,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 27,
        "name": "वोदनाथ",
        "spouses": [],
        "parentId": 15,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 28,
        "name": "रामशरण",
        "spouses": [
            "आशिका"
        ],
        "parentId": 20,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 29,
        "name": "रामकृष्ण",
        "spouses": [],
        "parentId": 20,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 30,
        "name": "संयोग",
        "spouses": [],
        "parentId": 21,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 31,
        "name": "समर्पण",
        "spouses": [],
        "parentId": 22,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 32,
        "name": "आगमन",
        "spouses": [],
        "parentId": 23,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 33,
        "name": "प्रभात",
        "spouses": [],
        "parentId": 24,
        "gender": "M",
        "hierarchyOrder": 99,
        "motherName": "अर्पणा"
    },
    {
        "id": 34,
        "name": "किशोर",
        "spouses": [
            "गिता"
        ],
        "parentId": 25,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 35,
        "name": "मिलन",
        "spouses": [],
        "parentId": 25,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 36,
        "name": "बसन्त",
        "spouses": [
            "बिन्दा"
        ],
        "parentId": 26,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 37,
        "name": "इशान",
        "spouses": [],
        "parentId": 34,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 38,
        "name": "श्रीयान",
        "spouses": [],
        "parentId": 36,
        "gender": "M",
        "hierarchyOrder": 99
    },
    {
        "id": 40,
        "name": "",
        "spouses": [],
        "parentId": 7,
        "gender": "F",
        "hierarchyOrder": 99
    },
    {
        "id": 41,
        "name": "डेण्डकुमारी",
        "spouses": [],
        "parentId": 11,
        "gender": "F",
        "hierarchyOrder": 99
    },
    {
        "id": 42,
        "name": "",
        "spouses": [],
        "parentId": 14,
        "gender": "F",
        "hierarchyOrder": 99
    },
    {
        "id": 43,
        "name": "सन्ध्या",
        "spouses": [],
        "parentId": 24,
        "gender": "F",
        "hierarchyOrder": 99,
        "motherName": "अर्पणा"
    },
    {
        "id": 44,
        "name": "शोभा",
        "spouses": [],
        "parentId": 25,
        "gender": "F",
        "hierarchyOrder": 99
    },
    {
        "id": 45,
        "name": "बर्षा",
        "spouses": [],
        "parentId": 26,
        "gender": "F",
        "hierarchyOrder": 99
    },
    {
        "id": 46,
        "name": "कमला",
        "spouses": [],
        "parentId": 20,
        "gender": "F",
        "hierarchyOrder": 99
    },
    {
        "id": 47,
        "name": "बिमला",
        "spouses": [],
        "parentId": 20,
        "gender": "F",
        "hierarchyOrder": 99
    },
    {
        "id": 48,
        "name": "निर्जला",
        "spouses": [],
        "parentId": 20,
        "gender": "F",
        "hierarchyOrder": 99
    },
    {
        "id": 49,
        "name": "सम्झौता",
        "spouses": [],
        "parentId": 21,
        "gender": "F",
        "hierarchyOrder": 99
    },
    {
        "id": 50,
        "name": "श्रीजया",
        "spouses": [],
        "parentId": 22,
        "gender": "F",
        "hierarchyOrder": 99
    },
    {
        "id": 51,
        "name": "नियना",
        "spouses": [],
        "parentId": 28,
        "gender": "F",
        "hierarchyOrder": 99
    },
    {
        "id": 70,
        "name": "सावित्रा",
        "parentId": 13,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99,
        "motherName": "भक्तकुमारी"
    },
    {
        "id": 71,
        "name": "विन्दा",
        "parentId": 13,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99,
        "motherName": "भक्तकुमारी"
    },
    {
        "id": 72,
        "name": "ईश्वरी",
        "parentId": 13,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99,
        "motherName": "भक्तकुमारी"
    },
    {
        "id": 73,
        "name": "शारदा",
        "parentId": 13,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99,
        "motherName": "भक्तकुमारी"
    },
    {
        "id": 74,
        "name": "निर्मला",
        "parentId": 13,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99,
        "motherName": "तारादेवी"
    },
    {
        "id": 75,
        "name": "नविना",
        "parentId": 13,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99,
        "motherName": "तारादेवी"
    },
    {
        "id": 76,
        "name": "",
        "parentId": 8,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99
    },
    {
        "id": 77,
        "name": "",
        "parentId": 8,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99
    },
    {
        "id": 78,
        "name": "",
        "parentId": 8,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99
    },
    {
        "id": 79,
        "name": "",
        "parentId": 8,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99
    },
    {
        "id": 80,
        "name": "",
        "parentId": 8,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99
    },
    {
        "id": 81,
        "name": "",
        "parentId": 8,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99
    },
    {
        "id": 82,
        "name": "",
        "parentId": 8,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99
    },
    {
        "id": 83,
        "name": "रमा",
        "parentId": 13,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99,
        "motherName": "भक्तकुमारी"
    },
    {
        "id": 84,
        "name": "दुर्गा",
        "parentId": 15,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99
    },
    {
        "id": 85,
        "name": "रेवती",
        "parentId": 15,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99
    },
    {
        "id": 86,
        "name": "रेखा",
        "parentId": 15,
        "gender": "F",
        "spouses": [],
        "hierarchyOrder": 99
    }
];