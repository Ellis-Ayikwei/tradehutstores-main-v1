import React from 'react';
import {
    faBox,
    faMusic,
    faCouch,
    faTv,
    faBlender,
    faWineGlassAlt,
    faDumbbell,
    faLeaf,
    faPencil,
    faBath,
    faSnowflake,
    faBoxOpen,
    faBabyCarriage,
    faPalette,
    faBasketballBall,
    faMaximize,
    faWrench,
    faCar,
    faGem,
    faBook,
    faBriefcase,
    faShirt,
    faMountain,
    faKitMedical,
    faLightbulb,
} from '@fortawesome/free-solid-svg-icons';

export type ItemCategory =
    | 'furniture'
    | 'electronics'
    | 'appliances'
    | 'musical'
    | 'boxes'
    | 'fragile'
    | 'exercise'
    | 'garden'
    | 'office_supplies'
    | 'kitchen_items'
    | 'bathroom'
    | 'seasonal'
    | 'storage'
    | 'children'
    | 'art_hobbies'
    | 'sports'
    | 'oversized'
    | 'tools_equipment'
    | 'automotive'
    | 'collectibles'
    | 'books_media'
    | 'business_equipment'
    | 'clothing_accessories'
    | 'outdoor_recreation'
    | 'medical_equipment'
    | 'home_decor';

export const formatCategoryString = (category: string): string => {
    return category.toLowerCase().split(' ').join('_');
};

export const getItemIcon = (category: string) => {
    const formattedCategory = formatCategoryString(category);
    const validCategory = isValidCategory(formattedCategory) ? formattedCategory : 'boxes';
    const colors = {
        furniture: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
        electronics: 'bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200',
        appliances: 'bg-yellow-100 text-yellow-500 dark:bg-yellow-800 dark:text-yellow-200',
        boxes: 'bg-orange-100 text-orange-500 dark:bg-orange-800 dark:text-orange-200',
        musical: 'bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200',
        fragile: 'bg-pink-100 text-pink-500 dark:bg-pink-800 dark:text-pink-200',
        exercise: 'bg-teal-100 text-teal-500 dark:bg-teal-800 dark:text-teal-200',
        garden: 'bg-lime-100 text-lime-500 dark:bg-lime-800 dark:text-lime-200',
        office_supplies: 'bg-indigo-100 text-indigo-500 dark:bg-indigo-800 dark:text-indigo-200',
        kitchen_items: 'bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200',
        bathroom: 'bg-cyan-100 text-cyan-500 dark:bg-cyan-800 dark:text-cyan-200',
        seasonal: 'bg-sky-100 text-sky-500 dark:bg-sky-800 dark:text-sky-200',
        storage: 'bg-orange-100 text-orange-500 dark:bg-orange-800 dark:text-orange-200',
        children: 'bg-purple-100 text-purple-500 dark:bg-purple-800 dark:text-purple-200',
        art_hobbies: 'bg-fuchsia-100 text-fuchsia-500 dark:bg-fuchsia-800 dark:text-fuchsia-200',
        sports: 'bg-amber-100 text-amber-500 dark:bg-amber-800 dark:text-amber-200',
        oversized: 'bg-rose-100 text-rose-500 dark:bg-rose-800 dark:text-rose-200',
        tools_equipment: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-200',
        automotive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-200',
        collectibles: 'bg-violet-100 text-violet-500 dark:bg-violet-800 dark:text-violet-200',
        books_media: 'bg-emerald-100 text-emerald-500 dark:bg-emerald-800 dark:text-emerald-200',
        business_equipment: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-200',
        clothing_accessories: 'bg-blue-100 text-blue-500 dark:bg-blue-800 dark:text-blue-200',
        outdoor_recreation: 'bg-lime-100 text-lime-500 dark:bg-lime-800 dark:text-lime-200',
        medical_equipment: 'bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200',
        home_decor: 'bg-purple-100 text-purple-500 dark:bg-purple-800 dark:text-purple-200',
    };

    const tabColor = {
        furniture: 'bg-blue-500 text-blue-100 dark:bg-blue-800 dark:text-blue-200',
        electronics: 'bg-green-500 text-green-100 dark:bg-green-800 dark:text-green-200',
        appliances: 'bg-yellow-500 text-yellow-100 dark:bg-yellow-800 dark:text-yellow-200',
        boxes: 'bg-orange-500 text-orange-100 dark:bg-orange-800 dark:text-orange-200',
        musical: 'bg-red-500 text-red-100 dark:bg-red-800 dark:text-red-200',
        fragile: 'bg-pink-500 text-pink-100 dark:bg-pink-800 dark:text-pink-200',
        exercise: 'bg-teal-500 text-teal-100 dark:bg-teal-800 dark:text-teal-200',
        garden: 'bg-lime-500 text-lime-100 dark:bg-lime-800 dark:text-lime-200',
        office_supplies: 'bg-indigo-500 text-indigo-100 dark:bg-indigo-800 dark:text-indigo-200',
        kitchen_items: 'bg-red-500 text-red-100 dark:bg-red-800 dark:text-red-200',
        bathroom: 'bg-cyan-500 text-cyan-100 dark:bg-cyan-800 dark:text-cyan-200',
        seasonal: 'bg-sky-500 text-sky-100 dark:bg-sky-800 dark:text-sky-200',
        storage: 'bg-orange-500 text-orange-100 dark:bg-orange-800 dark:text-orange-200',
        children: 'bg-purple-500 text-purple-100 dark:bg-purple-800 dark:text-purple-200',
        art_hobbies: 'bg-fuchsia-500 text-fuchsia-100 dark:bg-fuchsia-800 dark:text-fuchsia-200',
        sports: 'bg-amber-500 text-amber-100 dark:bg-amber-800 dark:text-amber-200',
        oversized: 'bg-rose-500 text-rose-100 dark:bg-rose-800 dark:text-rose-200',
        tools_equipment: 'bg-zinc-500 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-200',
        automotive: 'bg-slate-500 text-slate-100 dark:bg-slate-800 dark:text-slate-200',
        collectibles: 'bg-violet-500 text-violet-100 dark:bg-violet-800 dark:text-violet-200',
        books_media: 'bg-emerald-500 text-emerald-100 dark:bg-emerald-800 dark:text-emerald-200',
        business_equipment: 'bg-gray-500 text-gray-100 dark:bg-gray-800 dark:text-gray-200',
        clothing_accessories: 'bg-blue-500 text-blue-100 dark:bg-blue-800 dark:text-blue-200',
        outdoor_recreation: 'bg-lime-500 text-lime-100 dark:bg-lime-800 dark:text-lime-200',
        medical_equipment: 'bg-red-500 text-red-100 dark:bg-red-800 dark:text-red-200',
        home_decor: 'bg-purple-500 text-purple-100 dark:bg-purple-800 dark:text-purple-200',
    };

    const icons = {
        furniture: faCouch,
        electronics: faTv,
        appliances: faBlender,
        boxes: faBox,
        musical: faMusic,
        fragile: faWineGlassAlt,
        exercise: faDumbbell,
        garden: faLeaf,
        office_supplies: faPencil,
        kitchen_items: faBlender, // Using blender as a cooker substitute
        bathroom: faBath,
        seasonal: faSnowflake,
        storage: faBoxOpen,
        children: faBabyCarriage,
        art_hobbies: faPalette,
        sports: faBasketballBall,
        oversized: faMaximize,
        tools_equipment: faWrench,
        automotive: faCar,
        collectibles: faGem,
        books_media: faBook,
        business_equipment: faBriefcase,
        clothing_accessories: faShirt,
        outdoor_recreation: faMountain,
        medical_equipment: faKitMedical,
        home_decor: faLightbulb,
    };

    return {
        icon: icons[validCategory as ItemCategory],
        color: colors[validCategory as ItemCategory],
        tabColor: tabColor[validCategory as ItemCategory],
    };
};

function isValidCategory(category: string): category is ItemCategory {
    const validCategories: ItemCategory[] = [
        'furniture',
        'electronics',
        'appliances',
        'musical',
        'boxes',
        'fragile',
        'exercise',
        'garden',
        'office_supplies',
        'kitchen_items',
        'bathroom',
        'seasonal',
        'storage',
        'children',
        'art_hobbies',
        'sports',
        'oversized',
        'tools_equipment',
        'automotive',
        'collectibles',
        'books_media',
        'business_equipment',
        'clothing_accessories',
        'outdoor_recreation',
        'medical_equipment',
        'home_decor',
    ];
    return validCategories.includes(category as ItemCategory);
}
