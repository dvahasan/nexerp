import React from 'react';

export default function Skeleton({ className = "", shape = "rect" }) {
  // shape can be: 'rect', 'circle', 'text'
  let shapeClasses = "";
  if (shape === "circle") {
    shapeClasses = "rounded-full";
  } else if (shape === "rect") {
    shapeClasses = "rounded-2xl";
  } else if (shape === "text") {
    shapeClasses = "rounded-md";
  }

  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 ${shapeClasses} ${className}`}
    />
  );
}
