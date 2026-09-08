-- ============================================
-- TRIGGER: Update Bill Status automatically
-- ============================================

CREATE OR REPLACE FUNCTION update_bill_status_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_bill_id UUID;
  v_total_paid BIGINT;
  v_bill_amount BIGINT;
BEGIN
  -- Determine the bill_id depending on the operation
  IF TG_OP = 'DELETE' THEN
    v_bill_id := OLD.bill_id;
  ELSE
    v_bill_id := NEW.bill_id;
  END IF;

  -- Get total verified payments for this bill
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE bill_id = v_bill_id AND status = 'verified';

  -- Get the bill's total amount
  SELECT amount INTO v_bill_amount
  FROM bills
  WHERE id = v_bill_id;

  -- Update the bill status
  IF v_total_paid = 0 THEN
    UPDATE bills SET status = 'belum bayar' WHERE id = v_bill_id;
  ELSIF v_total_paid >= v_bill_amount THEN
    UPDATE bills SET status = 'lunas' WHERE id = v_bill_id;
  ELSE
    UPDATE bills SET status = 'sebagian' WHERE id = v_bill_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bill_status ON payments;

CREATE TRIGGER trigger_update_bill_status
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_bill_status_after_payment();
