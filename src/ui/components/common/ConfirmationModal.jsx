import IconBtn from "./IconBtn"
import Modal from "./Modal"
import Button from "./Button"

// Gates course deletion, section deletion, lecture deletion, and logout —
// the app's primary destructive-action dialog — and previously had none
// of Modal's accessibility behavior at all: no role, no focus trap, no
// Escape handler, no scroll lock, no focus restore. The parent always
// renders this conditionally ({confirmationModal && <ConfirmationModal/>}),
// so "open" is implicitly true whenever it's mounted; Escape and a
// backdrop click both map to btn2Handler (Cancel) since that's the
// equivalent action for a confirmation dialog.
export default function ConfirmationModal({ modalData }) {
  return (
    <Modal
      open={Boolean(modalData)}
      onClose={modalData?.btn2Handler}
      title={modalData?.text1}
      role="alertdialog"
      className="max-w-[350px]"
    >
      <p className="mt-3 mb-5 leading-6 text-richblack-200">{modalData?.text2}</p>
      <div className="flex items-center gap-x-4">
        <IconBtn onClick={modalData?.btn1Handler} text={modalData?.btn1Text} />
        <Button variant="ghost" onClick={modalData?.btn2Handler}>
          {modalData?.btn2Text}
        </Button>
      </div>
    </Modal>
  )
}
