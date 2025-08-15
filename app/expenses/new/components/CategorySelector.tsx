'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ExpenseCategory = 'Utilities' | 'Repairs' | 'Supplies' | 'Cleaning' | 'Maintenance' | 'Other'

interface CategorySelectorProps {
  selectedCategory?: ExpenseCategory
  onCategorySelect: (category: ExpenseCategory) => void
  onTemplateSelect?: (template: ExpenseTemplate) => void
}

interface ExpenseTemplate {
  id: string
  name: string
  category: ExpenseCategory
  amount?: number
  description: string
  isFrequent: boolean
}

const categories: { value: ExpenseCategory; label: string; icon: string; color: string }[] = [
  { value: 'Utilities', label: 'Utilities', icon: '⚡', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'Repairs', label: 'Repairs', icon: '🔧', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'Supplies', label: 'Supplies', icon: '📦', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'Cleaning', label: 'Cleaning', icon: '🧽', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'Maintenance', label: 'Maintenance', icon: '🛠️', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'Other', label: 'Other', icon: '📝', color: 'bg-gray-100 text-gray-800 border-gray-200' },
]

export function CategorySelector({ selectedCategory, onCategorySelect, onTemplateSelect }: CategorySelectorProps) {
  const [recentlyUsed] = useState<ExpenseCategory[]>(['Utilities', 'Supplies']) // TODO: Get from localStorage/API
  const [customCategories, setCustomCategories] = useState<string[]>([]) // TODO: Get from localStorage/API
  const [showCustomDialog, setShowCustomDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryTemplates] = useState<ExpenseTemplate[]>([
    {
      id: 'template_1',
      name: 'Monthly Electricity',
      category: 'Utilities',
      amount: 150000,
      description: 'Monthly electricity bill',
      isFrequent: true
    },
    {
      id: 'template_2',
      name: 'Cleaning Supplies',
      category: 'Cleaning',
      amount: 50000,
      description: 'Weekly cleaning supplies',
      isFrequent: true
    }
  ])

  // Show recently used categories first
  const sortedCategories = [
    ...categories.filter(cat => recentlyUsed.includes(cat.value)),
    ...categories.filter(cat => !recentlyUsed.includes(cat.value))
  ]

  const handleCreateCustomCategory = () => {
    if (newCategoryName.trim() && !customCategories.includes(newCategoryName.trim())) {
      const newCategory = newCategoryName.trim()
      setCustomCategories([...customCategories, newCategory])
      // TODO: Save to localStorage/API
      onCategorySelect('Other') // For now, map to 'Other' category
      setNewCategoryName('')
      setShowCustomDialog(false)
    }
  }

  const getTemplatesForCategory = (category: ExpenseCategory) => {
    return categoryTemplates.filter(template => template.category === category)
  }

  return (
    <div className="space-y-4">
      {/* Recently Used Section */}
      {recentlyUsed.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Recently Used</p>
          <div className="grid grid-cols-2 gap-2">
            {categories
              .filter(cat => recentlyUsed.includes(cat.value))
              .map((category) => (
                <CategoryButton
                  key={`recent-${category.value}`}
                  category={category}
                  isSelected={selectedCategory === category.value}
                  onClick={() => onCategorySelect(category.value)}
                  isRecent
                />
              ))}
          </div>
        </div>
      )}

      {/* All Categories */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">All Categories</p>
        <div className="grid grid-cols-2 gap-2">
          {sortedCategories.map((category) => (
            <CategoryButton
              key={category.value}
              category={category}
              isSelected={selectedCategory === category.value}
              onClick={() => onCategorySelect(category.value)}
            />
          ))}
          
          {/* Custom Category Creation */}
          <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-16 flex flex-col items-center justify-center gap-1 border-dashed"
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs font-medium">Add Custom</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Custom Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Category name (e.g., Garden, Security)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomCategory()}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateCustomCategory}
                    disabled={!newCategoryName.trim()}
                    className="flex-1"
                  >
                    Create Category
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCustomDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Templates */}
      {selectedCategory && getTemplatesForCategory(selectedCategory).length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {selectedCategory} Templates
          </p>
          <div className="space-y-2">
            {getTemplatesForCategory(selectedCategory).map((template) => (
              <Button
                key={template.id}
                type="button"
                variant="ghost"
                onClick={() => onTemplateSelect?.(template)}
                className="w-full justify-start h-auto p-3 border border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
              >
                <div className="flex items-center gap-2 w-full">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {template.amount ? `${template.amount.toLocaleString()} VND` : ''} • {template.description}
                    </p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Categories Display */}
      {customCategories.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Custom Categories</p>
          <div className="flex flex-wrap gap-2">
            {customCategories.map((category) => (
              <Button
                key={category}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onCategorySelect('Other')}
                className="h-8 text-xs"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface CategoryButtonProps {
  category: { value: ExpenseCategory; label: string; icon: string; color: string }
  isSelected: boolean
  onClick: () => void
  isRecent?: boolean
}

function CategoryButton({ category, isSelected, onClick, isRecent }: CategoryButtonProps) {
  return (
    <Button
      type="button"
      variant={isSelected ? "default" : "outline"}
      onClick={onClick}
      className={cn(
        "h-16 flex flex-col items-center justify-center gap-1 relative",
        "transition-all duration-200 active:scale-95",
        isSelected && "ring-2 ring-primary ring-offset-2",
        !isSelected && category.color
      )}
    >
      {isRecent && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
      )}
      <span className="text-xl">{category.icon}</span>
      <span className="text-xs font-medium">{category.label}</span>
    </Button>
  )
}
