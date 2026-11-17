/** The box drawn in front of a Radix checkbox item (a menu row that ticks). The
 *  row must carry `group`; the box reads its checked state from it. Matches the
 *  native checkbox look in index.css: rounded, teal when checked, white tick. */
export const CHECK_BOX =
  'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-gray-300 bg-white text-white transition-colors dark:border-white/30 dark:bg-transparent ' +
  'group-data-[state=checked]:border-brame-teal group-data-[state=checked]:bg-brame-teal ' +
  'dark:group-data-[state=checked]:border-brame-teal-light dark:group-data-[state=checked]:bg-brame-teal-light';
