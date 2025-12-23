import React, { useState } from 'react';
import CategoriesTab from './tabs/CategoriesTab';
import ItemsTab      from './tabs/ItemsTab';
import { Layers }    from 'lucide-react';
import BrandsTab from './tabs/BrandsTab';
import ModelsTab from './tabs/ModelsTab';
import TypesTab from './tabs/TypesTab';

const AdminConsole: React.FC = () => {
  const [active, setActive] = useState<'categories'|'brands'|'models'|'items'|'types'>('items');

  const tabs = [
    { key: 'categories', label: 'Categories' },
    { key: 'types',      label: 'Types'      },
    { key: 'brands',     label: 'Brands'     },
    { key: 'models',     label: 'Models'     },
    { key: 'items',      label: 'Common Items' }
  ] as const;

  return (
    <div className="">
      <div className="flex gap-4 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded flex items-center gap-1 ${
              active === t.key ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setActive(t.key)}
          >
            <Layers className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {active === 'categories' && <CategoriesTab />}
      {active === 'types'      && <TypesTab      />}
      {active === 'brands'     && <BrandsTab     />}
      {active === 'models'     && <ModelsTab     />}
      {active === 'items'      && <ItemsTab      />}
    </div>
  );
};

export default AdminConsole; 