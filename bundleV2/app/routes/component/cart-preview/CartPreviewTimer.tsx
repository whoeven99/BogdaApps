export function CartPreviewTimer({
  text,
  textColor,
  backgroundColor,
}: {
  text: string;
  textColor: string;
  backgroundColor: string;
}) {
  return (
    <div
      className="px-[16px] py-[10px] text-center text-[13px]"
      style={{
        background: backgroundColor,
        color: textColor,
      }}
    >
      <span className="font-semibold">{text}</span>
    </div>
  );
}
