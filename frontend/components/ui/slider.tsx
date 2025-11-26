import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  showValue?: boolean
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, showValue = true, value, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">{label}</label>
            {showValue && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {value}
              </span>
            )}
          </div>
        )}
        <input
          type="range"
          className={cn(
            'w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer slider-thumb',
            className
          )}
          ref={ref}
          value={value}
          {...props}
        />
        <style jsx>{`
          input[type='range']::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            background: rgb(37, 99, 235);
            border-radius: 50%;
            cursor: pointer;
          }
          input[type='range']::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: rgb(37, 99, 235);
            border-radius: 50%;
            cursor: pointer;
            border: none;
          }
        `}</style>
      </div>
    )
  }
)
Slider.displayName = 'Slider'

export { Slider }

