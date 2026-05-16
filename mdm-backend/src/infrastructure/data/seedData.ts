import type { Part } from "../../domain/entities/Part";
import type { PartNomenclature } from "../../domain/entities/PartNomenclature";
import type { Purchase } from "../../domain/entities/Purchase";
import type { ReferenceItem } from "../../domain/entities/ReferenceItem";

export const partCategories: ReferenceItem[] = [
  {
    id: 1,
    name: "Крепеж",
    description: "Болты, гайки, шайбы и другие крепежные изделия"
  },
  {
    id: 2,
    name: "Покупное комплектующее изделие",
    description: "Комплектующие, закупаемые у внешних поставщиков"
  },
  {
    id: 3,
    name: "Деталь собственного производства",
    description: "Детали, изготавливаемые внутри предприятия"
  },
  {
    id: 4,
    name: "Расходный материал",
    description: "Материалы и изделия, расходуемые в производственном процессе"
  },
  {
    id: 5,
    name: "Электрокомпонент",
    description: "Электрические и электронные компоненты"
  }
];

export const materials: ReferenceItem[] = [
  {
    id: 1,
    name: "Сталь оцинкованная",
    description: "Сталь с цинковым защитным покрытием"
  },
  {
    id: 2,
    name: "Сталь 40Х",
    description: "Конструкционная легированная сталь"
  },
  {
    id: 3,
    name: "Бронза БрАЖ9-4",
    description: "Алюминиево-железистая бронза"
  },
  {
    id: 4,
    name: "Сталь 09Г2С",
    description: "Низколегированная конструкционная сталь"
  },
  {
    id: 5,
    name: "Пластик ABS",
    description: "Ударопрочный технический пластик"
  }
];

export const suppliers: ReferenceItem[] = [
  {
    id: 1,
    name: "МеталлКомплект",
    description: "Поставщик крепежа и металлоизделий"
  },
  {
    id: 2,
    name: "ПромСнаб",
    description: "Поставщик производственных комплектующих"
  },
  {
    id: 3,
    name: "ТехноДеталь",
    description: "Поставщик точных деталей и втулок"
  },
  {
    id: 4,
    name: "Внутреннее производство",
    description: "Изготовление внутри предприятия"
  },
  {
    id: 5,
    name: "ЭлектроПоставка",
    description: "Поставщик электротехнических компонентов"
  }
];

export const measurementUnits: ReferenceItem[] = [
  {
    id: 1,
    name: "шт",
    description: "Штуки"
  },
  {
    id: 2,
    name: "кг",
    description: "Килограммы"
  },
  {
    id: 3,
    name: "м",
    description: "Метры"
  },
  {
    id: 4,
    name: "л",
    description: "Литры"
  },
  {
    id: 5,
    name: "компл",
    description: "Комплекты"
  }
];

export const partNomenclature: PartNomenclature[] = [
  {
    id: 1,
    code: "ГОСТ 11371-78",
    name: "Шайба плоская М10",
    category: "Крепеж",
    material: "Сталь оцинкованная",
    drawing: "DRW-WASHER-M10-001"
  },
  {
    id: 2,
    code: "ГОСТ 7798-70",
    name: "Болт М12x60",
    category: "Крепеж",
    material: "Сталь 40Х",
    drawing: "DRW-BOLT-M12-060"
  },
  {
    id: 3,
    code: "ГОСТ 5915-70",
    name: "Гайка шестигранная М12",
    category: "Крепеж",
    material: "Сталь оцинкованная",
    drawing: "DRW-NUT-M12-001"
  },
  {
    id: 4,
    code: "ПКИ-204-11",
    name: "Втулка направляющая",
    category: "Покупное комплектующее изделие",
    material: "Бронза БрАЖ9-4",
    drawing: "DRW-BUSHING-204-11"
  },
  {
    id: 5,
    code: "ЧРТ-77-02",
    name: "Кронштейн крепления двигателя",
    category: "Деталь собственного производства",
    material: "Сталь 09Г2С",
    drawing: "DRW-BRACKET-77-02"
  }
];

export const parts: Part[] = [
  {
    id: 1,
    nomenclatureId: 1,
    code: "ГОСТ 11371-78",
    name: "Шайба плоская М10",
    category: "Крепеж",
    material: "Сталь оцинкованная",
    unit: "шт",
    weight: 0.011,
    stock: 420,
    minStock: 150,
    drawing: "DRW-WASHER-M10-001",
    supplier: "МеталлКомплект"
  },
  {
    id: 2,
    nomenclatureId: 2,
    code: "ГОСТ 7798-70",
    name: "Болт М12x60",
    category: "Крепеж",
    material: "Сталь 40Х",
    unit: "шт",
    weight: 0.085,
    stock: 96,
    minStock: 120,
    drawing: "DRW-BOLT-M12-060",
    supplier: "ПромСнаб"
  },
  {
    id: 3,
    nomenclatureId: 3,
    code: "ГОСТ 5915-70",
    name: "Гайка шестигранная М12",
    category: "Крепеж",
    material: "Сталь оцинкованная",
    unit: "шт",
    weight: 0.026,
    stock: 280,
    minStock: 100,
    drawing: "DRW-NUT-M12-001",
    supplier: "МеталлКомплект"
  },
  {
    id: 4,
    nomenclatureId: 4,
    code: "ПКИ-204-11",
    name: "Втулка направляющая",
    category: "Покупное комплектующее изделие",
    material: "Бронза БрАЖ9-4",
    unit: "шт",
    weight: 0.34,
    stock: 18,
    minStock: 30,
    drawing: "DRW-BUSHING-204-11",
    supplier: "ТехноДеталь"
  },
  {
    id: 5,
    nomenclatureId: 5,
    code: "ЧРТ-77-02",
    name: "Кронштейн крепления двигателя",
    category: "Деталь собственного производства",
    material: "Сталь 09Г2С",
    unit: "шт",
    weight: 1.72,
    stock: 44,
    minStock: 20,
    drawing: "DRW-BRACKET-77-02",
    supplier: "Внутреннее производство"
  }
];

export const purchases: Purchase[] = [
  {
    id: 1,
    rawName: "Шайба плоская М10 · 100 шт",
    partId: 1,
    quantity: 100,
    price: 1200,
    supplier: "МеталлКомплект",
    employee: "Иванов Сергей",
    date: "2026-05-15"
  },
  {
    id: 2,
    rawName: "Болт М12x60 · 50 шт",
    partId: 2,
    quantity: 50,
    price: 3300,
    supplier: "ПромСнаб",
    employee: "Петров Алексей",
    date: "2026-05-14"
  }
];

export const departments = [
  {
    id: 1,
    name: "Отдел снабжения",
    manager: "Иванов Сергей",
    count: 4
  },
  {
    id: 2,
    name: "Склад",
    manager: "Кузнецова Мария",
    count: 8
  },
  {
    id: 3,
    name: "Производственный цех",
    manager: "Смирнов Павел",
    count: 24
  },
  {
    id: 4,
    name: "ИТ-отдел",
    manager: "Волков Дмитрий",
    count: 5
  }
];

export const employees = [
  {
    id: 1,
    name: "Иванов Сергей",
    position: "Специалист по закупкам",
    department: "Отдел снабжения",
    role: "Админ"
  },
  {
    id: 2,
    name: "Кузнецова Мария",
    position: "Начальник склада",
    department: "Склад",
    role: "Админ"
  },
  {
    id: 3,
    name: "Орлов Андрей",
    position: "Слесарь-сборщик",
    department: "Производственный цех",
    role: "Работник"
  },
  {
    id: 4,
    name: "Волков Дмитрий",
    position: "Системный администратор",
    department: "ИТ-отдел",
    role: "Админ"
  }
];

export const seedParts = parts;
export const seedPurchases = purchases;
export const seedDepartments = departments;
export const seedEmployees = employees;

export default {
  partCategories,
  materials,
  suppliers,
  measurementUnits,
  partNomenclature,
  parts,
  purchases,
  departments,
  employees
};